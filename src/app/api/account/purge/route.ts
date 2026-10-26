import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { removeUserMedia } from '@/lib/accountPurge';

interface DueDeletion {
  user_id: string;
  requested_at: string;
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.ACCOUNT_PURGE_SECRET;
  if (!expected || expected.length < 32) return false;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    ?? request.headers.get('x-purge-secret')
    ?? '';
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

/**
 * Permanently purge accounts whose seven-day deletion grace period has ended.
 *
 * Protect this route with ACCOUNT_PURGE_SECRET and invoke it from a scheduler
 * (for example a Cloudflare Cron Trigger or a Supabase scheduled function).
 * It is intentionally separate from the user-initiated schedule route so a
 * missed schedule never deletes an account early.
 */
export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Account purge is not configured.' }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('purge_due_account_deletions', { requested_limit: 20 });
    if (error) throw new Error(error.message);
    const due = (data ?? []) as DueDeletion[];

    const purged: string[] = [];
    const failed: { userId: string; error: string }[] = [];
    for (const entry of due) {
      try {
        try {
          await removeUserMedia(admin, entry.user_id);
        } catch (mediaError) {
          // Do not block the auth-user purge forever on an orphaned object, but
          // surface the failure so an operator can clean it up.
          console.error('Account media cleanup failed during purge.', entry.user_id, mediaError);
        }
        const { error: deleteError } = await admin.auth.admin.deleteUser(entry.user_id);
        if (deleteError) throw new Error(deleteError.message);
        purged.push(entry.user_id);
      } catch (purgeError) {
        failed.push({
          userId: entry.user_id,
          error: purgeError instanceof Error ? purgeError.message : 'Unknown purge failure.',
        });
      }
    }

    return NextResponse.json({ purged: purged.length, failed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'The purge run failed.' },
      { status: 500 },
    );
  }
}
