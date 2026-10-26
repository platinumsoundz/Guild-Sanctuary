import { getSupabaseBrowserClient } from '@/services/supabase';
import type { ModerationAppealRow } from '@/services/supabase/database.types';

export interface AdminAppeal extends ModerationAppealRow {
  username: string;
  display_name: string;
}

export async function submitModerationAppeal(reportId: string | null, message: string): Promise<void> {
  const trimmed = message.trim();
  if (trimmed.length < 10 || trimmed.length > 2000) {
    throw new Error('Explain your appeal in 10 to 2,000 characters.');
  }
  const { error } = await getSupabaseBrowserClient().rpc('submit_moderation_appeal', {
    requested_report_id: reportId,
    requested_message: trimmed,
  });
  if (error) throw new Error(error.message || 'Your appeal could not be submitted.');
}

export async function fetchMyAppeals(): Promise<ModerationAppealRow[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('fetch_my_moderation_appeals');
  if (error) throw new Error(error.message || 'Your appeals could not be loaded.');
  return data ?? [];
}

export async function fetchAppeals(
  status: 'open' | 'reviewing' | 'resolved' | 'denied' | null = 'open',
): Promise<AdminAppeal[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('admin_list_appeals', {
    requested_status: status,
  });
  if (error) throw new Error(error.message || 'Appeals could not be loaded.');
  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    report_id: row.report_id,
    action_id: row.action_id,
    message: row.message,
    status: row.status,
    resolution_notes: row.resolution_notes,
    resolved_by: row.resolved_by,
    resolved_at: row.resolved_at,
    created_at: row.created_at,
    username: row.username,
    display_name: row.display_name,
  }));
}

export async function resolveAppeal(
  appealId: string,
  status: 'reviewing' | 'resolved' | 'denied',
  notes: string,
): Promise<void> {
  const trimmed = notes.trim();
  // "Reviewing" may be set without notes; closing an appeal requires them.
  if (trimmed.length > 2000 || (status !== 'reviewing' && trimmed.length < 3)) {
    throw new Error('Add resolution notes between 3 and 2,000 characters.');
  }
  const { error } = await getSupabaseBrowserClient().rpc('admin_resolve_appeal', {
    requested_appeal_id: appealId,
    requested_status: status,
    requested_notes: trimmed,
  });
  if (error) throw new Error(error.message || 'The appeal could not be updated.');
}
