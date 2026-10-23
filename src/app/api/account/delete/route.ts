import { NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

const mediaBucket = 'community-media';

async function listAllObjects(
  admin: ReturnType<typeof createAdminClient>,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage
      .from(mediaBucket)
      .list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data) {
      const childPath = prefix ? `${prefix}/${item.name}` : item.name;
      // Folders have no id; recurse into them.
      if (!item.id) {
        paths.push(...await listAllObjects(admin, childPath));
      } else {
        paths.push(childPath);
      }
    }

    if (data.length < 1000) break;
    offset += data.length;
  }

  return paths;
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured() || !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Account deletion is not configured on this deployment.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Send a JSON body with emailConfirmation, phrase, and twoFactorCode.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
  const emailConfirmation = typeof record.emailConfirmation === 'string' ? record.emailConfirmation.trim().toLowerCase() : '';
  const phrase = typeof record.phrase === 'string' ? record.phrase : '';
  const twoFactorCode = typeof record.twoFactorCode === 'string' ? record.twoFactorCode.trim() : '';

  if (!emailConfirmation || phrase !== 'DELETE') {
    return NextResponse.json(
      { error: 'Type DELETE and confirm your account email to continue.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(`Your session could not be verified: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Sign in before deleting your account.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (user.email.toLowerCase() !== emailConfirmation) {
      return NextResponse.json(
        { error: 'The confirmation email does not match your signed-in account.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) throw new Error(`Your security settings could not be loaded: ${factorError.message}`);
    const verifiedFactor = factors?.totp.find((factor) => factor.status === 'verified');
    if (verifiedFactor) {
      if (!/^\d{6}$/.test(twoFactorCode)) {
        return NextResponse.json(
          { error: 'Enter your current authenticator code to delete your account.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });
      if (challengeError) throw new Error(`A verification challenge could not be started: ${challengeError.message}`);
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challenge.id,
        code: twoFactorCode,
      });
      if (verifyError) {
        return NextResponse.json(
          { error: 'The authenticator code is incorrect.' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } },
        );
      }
    }

    const admin = createAdminClient();

    // Remove stored media before deleting the auth user. Database rows cascade
    // from auth.users, but storage objects do not.
    try {
      const objects = await listAllObjects(admin, user.id);
      for (let index = 0; index < objects.length; index += 100) {
        const batch = objects.slice(index, index + 100);
        if (batch.length > 0) {
          const { error: removeError } = await admin.storage.from(mediaBucket).remove(batch);
          if (removeError) throw removeError;
        }
      }
    } catch (storageError) {
      // Do not block account deletion forever on an orphaned media object, but
      // surface the failure so an operator can clean it up.
      console.error('Account media cleanup failed during deletion.', storageError);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error(`Your account could not be deleted: ${deleteError.message}`);

    return NextResponse.json(
      { deleted: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Your account could not be deleted.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
