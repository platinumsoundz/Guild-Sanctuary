'use client';

import type { AuthSession } from './sessionStore';
import type { Profile, ProfilePrivacy, SocialLinks } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';

const permissions: AuthSession['permissions'] = [
  'feed:read',
  'post:create',
  'event:rsvp',
  'message:send',
  'profile:edit',
];

const emptyLinks: SocialLinks = {
  facebook: null,
  x: null,
  youtube: null,
  instagram: null,
  xbox: null,
  playstation: null,
  steam: null,
  epicGames: null,
  reddit: null,
};

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function toProfile(row: Awaited<ReturnType<typeof getProfileRow>>): Profile {
  const privacy = row.privacy && typeof row.privacy === 'object'
    ? row.privacy as Partial<ProfilePrivacy>
    : {};
  const socialLinks = row.social_links && typeof row.social_links === 'object'
    ? row.social_links as Partial<SocialLinks>
    : {};
  return {
    id: row.id,
    userId: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? null,
    statusMessage: row.status_message ?? null,
    avatarUrl: row.avatar_url ?? null,
    bannerUrl: row.banner_url ?? null,
    themeColor: row.theme_color,
    location: row.location ?? null,
    age: row.age ?? null,
    starSign: row.star_sign ?? null,
    belief: row.belief ?? null,
    privacy: {
      bio: privacy.bio ?? true,
      location: privacy.location ?? false,
      age: privacy.age ?? false,
      starSign: privacy.starSign ?? false,
      belief: privacy.belief ?? false,
      socialLinks: privacy.socialLinks ?? false,
      allowDirectMessages: privacy.allowDirectMessages ?? true,
    },
    socialLinks: { ...emptyLinks, ...socialLinks },
    visibility: row.visibility,
    role: row.role,
  };
}

async function getProfileRow(userId: string) {
  const { data, error } = await getSupabaseBrowserClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Your email is verified, but no profile row exists for this account. Check the auth_user_creates_profile trigger and apply the pending Supabase migrations.');
    }
    throw new Error(`Your account profile could not be loaded: ${error.message}`);
  }
  if (data.status !== 'active') throw new Error('This account is not active. Contact support for help.');
  return data;
}

async function buildSession(): Promise<AuthSession> {
  const client = getSupabaseBrowserClient();
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(`Your sign-in could not be verified: ${userError.message}`);
  const user = userResult.user;
  if (!user?.email || !user.email_confirmed_at) throw new Error('Verify your email before continuing.');
  const profileRow = await getProfileRow(user.id);
  const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
  if (factorError) {
    await clearUnverifiedAuthSession(client);
    throw new Error(`Your security settings could not be loaded: ${factorError.message}`);
  }
  const twoFactorEnabled = factors.totp.some((factor) => factor.status === 'verified');
  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerified: true,
      twoFactorEnabled,
      status: profileRow.status === 'suspended' || profileRow.status === 'banned' ? 'suspended' : 'active',
      createdAt: user.created_at,
      updatedAt: user.updated_at ?? user.created_at,
    },
    profile: toProfile(profileRow),
    permissions: [...permissions],
  };
}

export async function requestSupabaseEmailCode(email: string, signup?: { username: string; displayName: string }): Promise<void> {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: Boolean(signup),
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      ...(signup ? { data: { username: signup.username, display_name: signup.displayName } } : {}),
    },
  });
  if (error) throw new Error(`A verification code could not be sent: ${error.message}`);
}

export type SupabasePasswordSignIn = {
  session: AuthSession | null;
  challenge: { factorId: string; challengeId: string } | null;
};

async function clearUnverifiedAuthSession(client: ReturnType<typeof getSupabaseBrowserClient>): Promise<void> {
  // Password/OTP verification may establish an AAL1 provider session before the app
  // finishes its profile and MFA checks. Never leave that partial session active on failure.
  await client.auth.signOut({ scope: 'local' });
}

export async function signInWithSupabasePassword(
  email: string,
  password: string,
): Promise<SupabasePasswordSignIn> {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message.includes('Invalid login credentials')
    ? 'Email or password is incorrect.'
    : `Sign-in failed: ${error.message}`);

  const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
  if (factorError) {
    await clearUnverifiedAuthSession(client);
    throw new Error(`Your security settings could not be loaded: ${factorError.message}`);
  }
  const factor = factors.totp.find((item) => item.status === 'verified');

  if (factor) {
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) {
      await clearUnverifiedAuthSession(client);
      throw new Error(`Your authentication assurance could not be verified: ${assuranceError.message}`);
    }
    if (assurance.currentLevel !== 'aal2') {
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: factor.id });
      if (challengeError) {
        await clearUnverifiedAuthSession(client);
        throw new Error(`A two-factor challenge could not be started: ${challengeError.message}`);
      }
      return { session: null, challenge: { factorId: factor.id, challengeId: challenge.id } };
    }
  }

  try {
    return { session: await buildSession(), challenge: null };
  } catch (error) {
    await clearUnverifiedAuthSession(client);
    throw error;
  }
}

export async function signUpWithSupabasePassword(
  input: { email: string; username: string; displayName: string },
  password: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  if (password.length < 10) throw new Error('Use a password with at least 10 characters.');
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: { username: input.username.trim(), display_name: input.displayName.trim() },
    },
  });
  if (error) throw new Error(`Account creation failed: ${error.message}`);
  if (!data.user) throw new Error('Supabase did not return an account. Please try again.');

  // Existing deployments may have a profile-creation trigger. Do not duplicate profiles here.
  return { needsEmailConfirmation: !data.session };
}

export async function sendSupabasePasswordReset(email: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` },
  );
  if (error) throw new Error(`Password reset email could not be sent: ${error.message}`);
}

export async function updateSupabasePassword(password: string): Promise<void> {
  if (password.length < 10) throw new Error('Use a password with at least 10 characters.');
  const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
  if (error) throw new Error(`Password could not be changed: ${error.message}`);
}

export type SupabaseEmailVerification = {
  session: AuthSession | null;
  challenge: { factorId: string; challengeId: string } | null;
};

export async function verifySupabaseEmailCode(
  email: string,
  code: string,
): Promise<SupabaseEmailVerification> {
  const client = getSupabaseBrowserClient();
  const { error: verifyError } = await client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code,
    type: 'email',
  });
  if (verifyError) throw new Error(`Email verification failed: ${verifyError.message}`);

  const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
  if (factorError) {
    await clearUnverifiedAuthSession(client);
    throw new Error(`Your security settings could not be loaded: ${factorError.message}`);
  }
  const factor = factors.totp.find((item) => item.status === 'verified');
  if (factor) {
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) {
      await clearUnverifiedAuthSession(client);
      throw new Error(`A two-factor challenge could not be started: ${challengeError.message}`);
    }
    return { session: null, challenge: { factorId: factor.id, challengeId: challenge.id } };
  }
  try {
    return { session: await buildSession(), challenge: null };
  } catch (error) {
    await clearUnverifiedAuthSession(client);
    throw error;
  }
}

export async function verifySupabaseTotpCode(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<AuthSession> {
  const { error } = await getSupabaseBrowserClient().auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw new Error(`Two-factor verification failed: ${error.message}`);
  try {
    return await buildSession();
  } catch (sessionError) {
    await clearUnverifiedAuthSession(getSupabaseBrowserClient());
    throw sessionError;
  }
}

export async function restoreSupabaseSession(): Promise<AuthSession | null> {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(`Your session could not be restored: ${error.message}`);
  if (!data.session) return null;
  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
  if (factorsError) throw new Error(`Your security settings could not be loaded: ${factorsError.message}`);
  const hasVerifiedTotp = factors.totp.some((factor) => factor.status === 'verified');
  if (hasVerifiedTotp) {
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw new Error(`Your authentication assurance could not be verified: ${assuranceError.message}`);
    if (assurance.currentLevel !== 'aal2') return null;
  }
  return buildSession();
}
