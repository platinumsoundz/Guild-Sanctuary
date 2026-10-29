import type { ContentReportRow, ModerationAction } from '@/services/supabase';
import { getSupabaseBrowserClient } from '@/services/supabase';

export type ReportTarget = ContentReportRow['target_type'];

export interface ModerationQueueItem extends ContentReportRow {
  targetOwnerId: string | null;
  targetOwnerUsername: string | null;
  targetOwnerDisplayName: string | null;
  targetContent: string | null;
  targetTitle: string | null;
  targetMediaUrl: string | null;
  targetState: string | null;
  targetCreatedAt: string | null;
}

type ModerationQueueRecord = {
  report_id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  details: string | null;
  report_status: ContentReportRow['status'];
  reviewed_by: string | null;
  reviewed_at: string | null;
  reported_at: string;
  target_owner_id: string | null;
  target_owner_username: string | null;
  target_owner_display_name: string | null;
  target_content: string | null;
  target_title: string | null;
  target_media_url: string | null;
  target_state: string | null;
  target_created_at: string | null;
};

export async function submitContentReport(input: {
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const reason = input.reason.trim();
  const details = input.details?.trim() ?? '';
  if (reason.length < 2 || reason.length > 80 || details.length > 2000) {
    throw new Error('Choose a report reason and keep the details under 2,000 characters.');
  }

  const { error } = await getSupabaseBrowserClient().rpc('submit_content_report', {
    requested_target_type: input.targetType,
    requested_target_id: input.targetId,
    requested_reason: reason,
    requested_details: details || null,
  });
  if (error) throw new Error(`Report could not be submitted: ${error.message}`);
}

export async function fetchModerationQueue(): Promise<ModerationQueueItem[]> {
  const client = getSupabaseBrowserClient();
  const { data: userData, error: authError } = await client.auth.getUser();
  if (authError) throw new Error(`Your account could not be verified: ${authError.message}`);
  if (!userData.user) throw new Error('Sign in with your platform account to access moderation.');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role,status')
    .eq('id', userData.user.id)
    .single();
  if (profileError) throw new Error(`Your moderation permissions could not be checked: ${profileError.message}`);
  if (!['moderator', 'admin', 'developer', 'owner'].includes(profile.role) || profile.status !== 'active') {
    throw new Error('This account is not authorized to use moderation tools.');
  }

  // The SECURITY DEFINER RPC returns the reported target body through one role-gated
  // path, including hidden content that ordinary feed queries intentionally cannot read.
  const { data, error } = await client.rpc('get_moderation_queue');
  if (error) throw new Error(`Moderation reports could not be loaded: ${error.message}`);

  return ((data ?? []) as unknown as ModerationQueueRecord[]).map((row) => ({
    id: row.report_id,
    reporter_id: row.reporter_id,
    target_type: row.target_type,
    target_id: row.target_id,
    reason: row.reason,
    details: row.details,
    status: row.report_status,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.reported_at,
    targetOwnerId: row.target_owner_id,
    targetOwnerUsername: row.target_owner_username,
    targetOwnerDisplayName: row.target_owner_display_name,
    targetContent: row.target_content,
    targetTitle: row.target_title,
    targetMediaUrl: row.target_media_url,
    targetState: row.target_state,
    targetCreatedAt: row.target_created_at,
  }));
}

export async function takeModerationAction(input: {
  report: ModerationQueueItem;
  action: ModerationAction;
  rationale: string;
  temporarySuspension?: boolean;
}): Promise<void> {
  const rationale = input.rationale.trim();
  if (rationale.length < 3 || rationale.length > 1000) {
    throw new Error('Add a moderation rationale between 3 and 1,000 characters.');
  }

  const isAccountAction = ['warn', 'suspend', 'ban'].includes(input.action);
  const targetId = isAccountAction ? input.report.targetOwnerId : input.report.target_id;
  if (!targetId) throw new Error('The report target is no longer available.');

  const { error } = await getSupabaseBrowserClient().rpc('apply_moderation_action', {
    requested_report_id: input.report.id,
    requested_target_type: isAccountAction ? 'user' : input.report.target_type,
    requested_target_id: targetId,
    requested_action: input.action,
    requested_rationale: rationale,
    requested_expires_at: input.temporarySuspension
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null,
  });
  if (error) throw new Error(`Moderation action could not be applied: ${error.message}`);
}
