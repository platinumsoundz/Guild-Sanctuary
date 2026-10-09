import type { ContentReportRow, ModerationAction } from '@/services/supabase';
import { getSupabaseBrowserClient } from '@/services/supabase';

export type ReportTarget = ContentReportRow['target_type'];

export interface ModerationQueueItem extends ContentReportRow {
  targetOwnerId: string | null;
}

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
  if (!['moderator', 'admin'].includes(profile.role) || profile.status !== 'active') {
    throw new Error('This account is not authorized to use moderation tools.');
  }

  const { data: reports, error } = await client
    .from('content_reports')
    .select('*')
    .in('status', ['open', 'reviewing'])
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(`Moderation reports could not be loaded: ${error.message}`);

  return Promise.all(reports.map(async (report) => {
    const { data: targetOwnerId, error: ownerError } = await client.rpc('get_report_target_owner', {
      requested_target_type: report.target_type,
      requested_target_id: report.target_id,
    });
    if (ownerError) throw new Error(`Report context could not be loaded: ${ownerError.message}`);
    return { ...report, targetOwnerId };
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
