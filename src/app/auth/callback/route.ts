import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

const allowedOtpTypes: EmailOtpType[] = [
  'signup',
  'email',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
];

export async function GET(request: NextRequest) {
  const destination = new URL('/', request.url);

  if (!isSupabaseServerConfigured()) {
    destination.searchParams.set('auth', 'configuration-error');
    return NextResponse.redirect(destination);
  }

  const code = request.nextUrl.searchParams.get('code');
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const requestedType = request.nextUrl.searchParams.get('type');

  let verificationError: Error | null = null;

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      verificationError = error;
    } else if (tokenHash && requestedType && allowedOtpTypes.includes(requestedType as EmailOtpType)) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: requestedType as EmailOtpType,
      });
      verificationError = error;
    } else {
      verificationError = new Error('The email confirmation link is invalid or incomplete.');
    }
  } catch (error) {
    verificationError = error instanceof Error
      ? error
      : new Error('The email confirmation could not be completed.');
  }

  destination.searchParams.set('auth', verificationError ? 'confirmation-error' : 'confirmed');
  return NextResponse.redirect(destination);
}
