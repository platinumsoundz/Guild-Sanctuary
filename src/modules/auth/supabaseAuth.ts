'use client';

import type { AuthSession, SignUpInput } from './sessionStore';
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
  const privacy = row.privacy as Partial<ProfilePrivacy>;
  return {
    id: row.id,
    userId: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    statusMessage: row.status_message,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    themeColor: row.theme_color,
    location: row.location,
    age: row.age,
    starSign: row.star_sign,
    belief: row.belief,
    privacy: {
      bio: privacy.bio ?? true,
      location: privacy.location ?? false,
      age: privacy.age ?? false,
      starSign: privacy.starSign ?? false,
      belief: privacy.belief ?? false,
      socialLinks: privacy.socialLinks ?? false,
      allowDirectMessages: privacy.allowDirectMessages ?? true,
    },
    socialLinks: { ...emptyLinks, ...(row.social_links as Partial<SocialLinks>) },
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
  if (error) throw new Error(`Your account profile could not be loaded: ${error.message}`);
  if (data.status !== 'active') throw new Error('This account is not active. Contact support for help.');
  return data;
}

async function buildSession(entryWorld: SignUpInput['entryWorld']): Promise<AuthSession> {
  const client = getSupabaseBrowserClient();
  const { data: userResult, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(`Your sign-in could not be verified: ${userError.message}`);
  const user = userResult.user;
  if (!user?.email || !user.email_confirmed_at) throw new Error('Verify your email before continuing.');
  const profileRow = await getProfileRow(user.id);
  const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
  if (factorError) throw new Error(`Your security settings could not be loaded: ${factorError.message}`);
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
    entryWorld,
    permissions: [...permissions],
  };
}

export async function requestSupabaseEmailCode(email: string, signup?: SignUpInput): Promise<void> {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: Boolean(signup),
      ...(signup ? { data: { username: signup.username, displayName: signup.displayName } } : {}),
    },
  });
  if (error) throw new Error(`A verification code could not be sent: ${error.message}`);
}

export type SupabaseEmailVerification = {
  session: AuthSession | null;
  challenge: { factorId: string; challengeId: string } | null;
};

export async function verifySupabaseEmailCode(
  email: string,
  code: string,
  entryWorld: SignUpInput['entryWorld'],
): Promise<SupabaseEmailVerification> {
  const client = getSupabaseBrowserClient();
  const { error: verifyError } = await client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code,
    type: 'email',
  });
  if (verifyError) throw new Error(`Email verification failed: ${verifyError.message}`);

  const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
  if (factorError) throw new Error(`Your security settings could not be loaded: ${factorError.message}`);
  const factor = factors.totp.find((item) => item.status === 'verified');
  if (factor) {
    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) throw new Error(`A two-factor challenge could not be started: ${challengeError.message}`);
    return { session: null, challenge: { factorId: factor.id, challengeId: challenge.id } };
  }
  return { session: await buildSession(entryWorld), challenge: null };
}

export async function verifySupabaseTotpCode(
  factorId: string,
  challengeId: string,
  code: string,
  entryWorld: SignUpInput['entryWorld'],
): Promise<AuthSession> {
  const { error } = await getSupabaseBrowserClient().auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw new Error(`Two-factor verification failed: ${error.message}`);
  return buildSession(entryWorld);
}

export async function restoreSupabaseSession(entryWorld: SignUpInput['entryWorld']): Promise<AuthSession | null> {
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
  return buildSession(entryWorld);
}
