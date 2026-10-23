'use client';

import type { AccountPreferences, AccountSettings } from '@/types/database';
import { isSupabaseAuthConfigured } from '@/modules/auth';
import { getSupabaseBrowserClient } from '@/services/supabase';

const storagePrefix = 'guild-sanctuary:settings:v1:';

export const defaultAccountPreferences: AccountPreferences = {
  allowProfileDiscovery: true,
  allowDirectMessages: true,
  showOnlineStatus: false,
  emailNotifications: true,
  personalizedFeed: true,
  layout: 'comfortable',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Account settings are only available in the browser.');
  }
  try {
    return window.localStorage;
  } catch {
    throw new Error('Browser storage is unavailable. Check your browser privacy settings.');
  }
}

function normalizePreferences(value: unknown): AccountPreferences {
  const record = isRecord(value) ? value : {};
  return {
    allowProfileDiscovery: typeof record.allowProfileDiscovery === 'boolean' ? record.allowProfileDiscovery : true,
    allowDirectMessages: typeof record.allowDirectMessages === 'boolean' ? record.allowDirectMessages : true,
    showOnlineStatus: typeof record.showOnlineStatus === 'boolean' ? record.showOnlineStatus : false,
    emailNotifications: typeof record.emailNotifications === 'boolean' ? record.emailNotifications : true,
    personalizedFeed: typeof record.personalizedFeed === 'boolean' ? record.personalizedFeed : true,
    layout: record.layout === 'compact' ? 'compact' : 'comfortable',
  };
}

function readLocalSettings(userId: string): AccountSettings {
  let stored: unknown;
  try {
    const raw = getStorage().getItem(`${storagePrefix}${userId}`);
    stored = raw ? JSON.parse(raw) : null;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Saved account settings are damaged and could not be loaded.');
    }
    throw error;
  }

  const record = isRecord(stored) ? stored : {};
  return {
    userId,
    preferences: normalizePreferences(record.preferences),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
  };
}

function writeLocalSettings(settings: AccountSettings): AccountSettings {
  try {
    getStorage().setItem(`${storagePrefix}${settings.userId}`, JSON.stringify(settings));
  } catch {
    throw new Error('Account settings could not be saved in this browser.');
  }
  return settings;
}

export async function fetchAccountSettings(userId: string): Promise<AccountSettings> {
  if (!userId) {
    throw new Error('Sign in to view account settings.');
  }

  if (!isSupabaseAuthConfigured()) {
    return readLocalSettings(userId);
  }

  const client = getSupabaseBrowserClient();
  const { data, error } = await client
    .from('account_settings')
    .select('preferences,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Account settings could not be loaded: ${error.message}`);

  if (!data) {
    const { data: created, error: createError } = await client
      .from('account_settings')
      .insert({ user_id: userId, preferences: defaultAccountPreferences as unknown as Record<string, unknown> })
      .select('preferences,updated_at')
      .single();
    if (createError) throw new Error(`Account settings could not be created: ${createError.message}`);
    return {
      userId,
      preferences: normalizePreferences(created.preferences),
      updatedAt: created.updated_at,
    };
  }

  return {
    userId,
    preferences: normalizePreferences(data.preferences),
    updatedAt: data.updated_at,
  };
}

export async function saveAccountPreferences(userId: string, preferences: AccountPreferences): Promise<AccountSettings> {
  if (!userId) {
    throw new Error('Sign in before changing account settings.');
  }
  if (preferences.layout !== 'comfortable' && preferences.layout !== 'compact') {
    throw new Error('Choose a supported layout arrangement.');
  }

  if (isSupabaseAuthConfigured()) {
    const { data, error } = await getSupabaseBrowserClient()
      .from('account_settings')
      .upsert({ user_id: userId, preferences: preferences as unknown as Record<string, unknown> }, { onConflict: 'user_id' })
      .select('preferences,updated_at')
      .single();
    if (error) throw new Error(`Account settings could not be saved: ${error.message}`);
    return {
      userId,
      preferences: normalizePreferences(data.preferences),
      updatedAt: data.updated_at,
    };
  }

  return writeLocalSettings({
    userId,
    preferences,
    updatedAt: new Date().toISOString(),
  });
}

export function removeAccountSettings(userId: string): void {
  if (isSupabaseAuthConfigured()) return;

  try {
    getStorage().removeItem(`${storagePrefix}${userId}`);
  } catch {
    throw new Error('Saved account settings could not be removed from this browser.');
  }
}
