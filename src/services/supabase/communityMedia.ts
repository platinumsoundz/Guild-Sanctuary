'use client';

import { getSupabaseBrowserClient } from './client';

const bucketName = 'community-media';
const signedUrlLifetimeSeconds = 60 * 60;

export function isSupabaseCommunityStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function requireCommunityStorageUser(expectedUserId?: string): Promise<string> {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(`Your sign-in could not be verified: ${error.message}`);
  if (!data.user) throw new Error('Sign in with your community account before publishing.');
  if (expectedUserId && data.user.id !== expectedUserId) {
    throw new Error('Your current account does not match the publishing account. Sign out and sign in again.');
  }
  const { data: factors, error: factorError } = await client.auth.mfa.listFactors();
  if (factorError) throw new Error(`Your account security level could not be verified: ${factorError.message}`);
  if (factors.totp.some((factor) => factor.status === 'verified')) {
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw new Error(`Your account security level could not be verified: ${assuranceError.message}`);
    if (assurance.currentLevel !== 'aal2') {
      throw new Error('Complete your authenticator verification before using community content.');
    }
  }
  return data.user.id;
}

export async function uploadCommunityMedia(userId: string, file: File, prefix: 'posts' | 'shorts'): Promise<string> {
  if (!file.size || file.size > 5 * 1024 * 1024) {
    throw new Error('Media must be a non-empty file no larger than 5 MB.');
  }
  const allowedTypes = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime',
  ]);
  if (!allowedTypes.has(file.type)) {
    throw new Error('This file format is not supported for community uploads.');
  }
  const client = getSupabaseBrowserClient();
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const objectPath = `${userId}/${prefix}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(bucketName).upload(objectPath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Media upload failed: ${error.message}`);
  return objectPath;
}

export async function createCommunityMediaUrl(objectPath: string): Promise<string> {
  if (/^https?:\/\//i.test(objectPath)) return objectPath;
  const { data, error } = await getSupabaseBrowserClient()
    .storage.from(bucketName)
    .createSignedUrl(objectPath, signedUrlLifetimeSeconds);
  if (error) throw new Error(`Media could not be opened: ${error.message}`);
  return data.signedUrl;
}

export async function createCommunityMediaUrls(objectPaths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uniquePaths = [...new Set(objectPaths.filter((path) => path && !/^https?:\/\//i.test(path)))];
  if (uniquePaths.length > 0) {
    const { data, error } = await getSupabaseBrowserClient()
      .storage.from(bucketName)
      .createSignedUrls(uniquePaths, signedUrlLifetimeSeconds);
    if (error) throw new Error(`Community media could not be opened: ${error.message}`);
    for (const signed of data) {
      if (signed.error || !signed.signedUrl) {
        throw new Error(`A community media file could not be opened: ${signed.error ?? 'signed URL unavailable'}`);
      }
      if (!signed.path) throw new Error('A community media file was returned without its storage path.');
      result.set(signed.path, signed.signedUrl);
    }
  }
  for (const path of objectPaths) {
    if (/^https?:\/\//i.test(path)) result.set(path, path);
  }
  return result;
}

export async function removeCommunityMedia(objectPath: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().storage.from(bucketName).remove([objectPath]);
  if (error) throw new Error(`Uploaded media cleanup failed: ${error.message}`);
}
