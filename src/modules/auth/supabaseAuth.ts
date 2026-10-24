'use client';

import type { AuthSession } from './sessionStore';
import type { Profile, ProfilePrivacy, PublicProfile, SocialLinks } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import type { ProfileRow, PublicProfileRow } from '@/services/supabase/database.types';

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

export function mapProfileRow(row: ProfileRow): Profile {
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
    equippedFrame: row.equipped_frame ?? null,
    equippedEffect: row.equipped_effect ?? null,
    equippedBadge: row.equipped_badge ?? null,
    equippedBanner: row.equipped_banner ?? null,
  };
}

export function mapPublicProfileRow(row: PublicProfileRow): PublicProfile {
  return {
    userId: row.id,
    profileId: row.id,
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
    socialLinks: { ...emptyLinks, ...(row.social_links as Partial<SocialLinks>) },
    allowDirectMessages: row.allow_direct_messages,
    role: 'member',
    equippedFrame: row.equipped_frame ?? null,
    equippedEffect: row.equipped_effect ?? null,
    equippedBadge: row.equipped_badge ?? null,
    equippedBanner: row.equipped_banner ?? null,
  };
}

function isProfileActive(profile: ProfileRow): boolean {
  if (profile.status === 'active') return true;
  return (
    profile.status === 'suspended' &&
    profile.suspended_until !== null &&
    Date.parse(profile.suspended_until) <= Date.now()
  );
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
  if (!isProfileActive(data)) throw new Error('This account is not active. Contact support for help.');
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
  if (factorError) throw new Error(`Your security settings could not be loaded: ${factorError.message}`);
  const twoFactorEnabled = factors.totp.some((factor) => factor.status === 'verified');
  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerified: true,
      twoFactorEnabled,
      status: isProfileActive(profileRow) ? 'active' : 'suspended',
      createdAt: user.created_at,
      updatedAt: user.updated_at ?? user.created_at,
    },
    profile: mapProfileRow(profileRow),
    permissions: [...permissions],
  };
}

export type SupabaseProfileUpdate = Partial<Omit<Profile, 'id' | 'userId' | 'role'>>;

export async function updateSupabaseProfile(
  userId: string,
  updates: SupabaseProfileUpdate,
): Promise<Profile> {
  const payload: Partial<ProfileRow> = {};

  if (updates.displayName !== undefined) payload.display_name = updates.displayName.trim();
  if (updates.bio !== undefined) payload.bio = updates.bio?.trim() || null;
  if (updates.statusMessage !== undefined) payload.status_message = updates.statusMessage?.trim() || null;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.bannerUrl !== undefined) payload.banner_url = updates.bannerUrl;
  if (updates.themeColor !== undefined) payload.theme_color = updates.themeColor;
  if (updates.location !== undefined) payload.location = updates.location?.trim() || null;
  if (updates.age !== undefined) payload.age = updates.age;
  if (updates.starSign !== undefined) payload.star_sign = updates.starSign;
  if (updates.belief !== undefined) payload.belief = updates.belief?.trim() || null;
  if (updates.socialLinks !== undefined) {
    const { facebook, x, youtube, xbox, playstation, steam, epicGames, reddit } = updates.socialLinks;
    payload.social_links = { facebook, x, youtube, xbox, playstation, steam, epicGames, reddit };
  }
  if (updates.visibility !== undefined) {
    payload.visibility = updates.visibility;
    payload.allow_profile_discovery = updates.visibility === 'public';
  }
  if (updates.privacy !== undefined) {
    const { bio, location, age, starSign, belief, socialLinks, allowDirectMessages } = updates.privacy;
    payload.privacy = { bio, location, age, starSign, belief, socialLinks, allowDirectMessages };
    payload.allow_direct_messages = allowDirectMessages;
  }

  if (Object.keys(payload).length === 0) {
    const { data, error } = await getSupabaseBrowserClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw new Error(`Your profile could not be loaded: ${error.message}`);
    return mapProfileRow(data);
  }

  const { data, error } = await getSupabaseBrowserClient()
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new Error(`Your profile could not be updated: ${error.message}`);
  return mapProfileRow(data);
}

export async function requestSupabaseEmailCode(email: string, signup?: { username: string; displayName: string }): Promise<void> {
  const client = getSupabaseBrowserClient();
  const { error } = await client.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: Boolean(signup),
      emailRedirectTo: `${window.location.origin}/auth/callback`,
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
  return { session: await buildSession(), challenge: null };
}

export async function verifySupabaseTotpCode(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<AuthSession> {
  const { error } = await getSupabaseBrowserClient().auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw new Error(`Two-factor verification failed: ${error.message}`);
  return buildSession();
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
