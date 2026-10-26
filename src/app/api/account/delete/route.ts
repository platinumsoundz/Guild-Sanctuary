import { NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
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

    // Schedule a seven-day grace period. The profile is hidden immediately by
    // the RPC; permanent media removal and auth-user deletion happen in the
    // separate, secret-protected purge route.
    const { data: purgeAfter, error: scheduleError } = await supabase.rpc('request_account_deletion');
    if (scheduleError) throw new Error(`Account deletion could not be scheduled: ${scheduleError.message}`);
    if (typeof purgeAfter !== 'string') throw new Error('Account deletion did not return a purge date.');

    return NextResponse.json(
      { deletionScheduled: true, purgeAfter },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Your account could not be deleted.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
