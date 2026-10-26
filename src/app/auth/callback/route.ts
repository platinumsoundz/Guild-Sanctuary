import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedOtpTypes: EmailOtpType[] = [
  'signup',
  'email',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
];

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const requestedType = request.nextUrl.searchParams.get('type');
  const supabase = await createClient();

  let verificationError: Error | null = null;

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

  const destination = new URL(!verificationError && requestedType === 'recovery' ? '/reset-password' : '/', request.url);
  destination.searchParams.set('auth', verificationError ? 'confirmation-error' : 'confirmed');
  return NextResponse.redirect(destination);
}
