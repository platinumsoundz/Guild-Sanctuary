import type { ContentReportRow, ModerationAction } from '@/services/supabase';
import type { WorldType } from '@/types/database';
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

export async function fetchModerationQueue(worldType: WorldType = 'sanctuary'): Promise<ModerationQueueItem[]> {
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

  // Use the existing RLS-protected report table instead of relying on a queue RPC
  // that is not present in both live schemas. Target ownership is resolved by the
  // existing moderator-only RPC. Message bodies are intentionally not fetched here:
  // private message preview needs its own audited, role-gated context endpoint.
  const { data: reports, error } = await client
    .from('content_reports')
    .select('*')
    .in('status', ['open', 'reviewing'])
    .eq('world_type', worldType)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(`Moderation reports could not be loaded: ${error.message}`);

  return Promise.all((reports ?? []).map(async (report) => {
    const { data: resolvedOwnerId, error: ownerError } = await client.rpc('get_report_target_owner', {
      requested_target_type: report.target_type,
      requested_target_id: report.target_id,
    });
    // A single stale/deleted target or an RPC issue should not take down the
    // entire queue. Content actions remain server-validated; account actions
    // stay disabled until the target owner can be verified.
    const targetOwnerId = ownerError ? null : resolvedOwnerId;

    let targetContent: string | null = null;
    let targetTitle: string | null = null;
    let targetMediaUrl: string | null = null;
    let targetState: string | null = null;
    let targetCreatedAt: string | null = null;

    if (report.target_type === 'post') {
      const { data } = await client.from('posts').select('content,media_url,state,created_at').eq('id', report.target_id).maybeSingle();
      if (data) {
        targetContent = data.content?.slice(0, 600) ?? null;
        targetMediaUrl = data.media_url && (data.media_url.startsWith('https://') || data.media_url.startsWith('http://')) ? data.media_url : null;
        targetState = data.state;
        targetCreatedAt = data.created_at;
      }
    } else if (report.target_type === 'short') {
      const { data } = await client.from('short_videos').select('caption,video_url,state,created_at').eq('id', report.target_id).maybeSingle();
      if (data) {
        targetContent = data.caption?.slice(0, 600) ?? null;
        targetMediaUrl = data.video_url && (data.video_url.startsWith('https://') || data.video_url.startsWith('http://')) ? data.video_url : null;
        targetState = data.state;
        targetCreatedAt = data.created_at;
      }
    } else if (report.target_type === 'event') {
      const { data } = await client.from('events').select('title,description,state,created_at').eq('id', report.target_id).maybeSingle();
      if (data) {
        targetTitle = data.title?.slice(0, 160) ?? null;
        targetContent = data.description?.slice(0, 600) ?? null;
        targetState = data.state;
        targetCreatedAt = data.created_at;
      }
    } else if (report.target_type === 'comment') {
      const { data } = await client.from('social_comments').select('body,state,created_at').eq('id', report.target_id).maybeSingle();
      if (data) {
        targetContent = data.body?.slice(0, 600) ?? null;
        targetState = data.state;
        targetCreatedAt = data.created_at;
      }
    } else if (report.target_type === 'message') {
      // Keep private-message reports in the queue, but do not load message bodies
      // through the ordinary messages table. A separately audited context endpoint
      // is required before staff can preview private conversation content.
    }

    let targetOwnerUsername: string | null = null;
    let targetOwnerDisplayName: string | null = null;
    if (targetOwnerId) {
      const { data: owner } = await client.from('public_profiles')
        .select('username,display_name')
        .eq('id', targetOwnerId)
        .maybeSingle();
      targetOwnerUsername = owner?.username ?? null;
      targetOwnerDisplayName = owner?.display_name ?? null;
    }

    return {
      ...report,
      targetOwnerId: targetOwnerId ?? null,
      targetOwnerUsername,
      targetOwnerDisplayName,
      targetContent,
      targetTitle,
      targetMediaUrl,
      targetState,
      targetCreatedAt,
    };
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
