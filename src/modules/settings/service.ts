import type { AccountPreferences, AccountSettings } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured } from '@/services/supabase/communityMedia';

const storagePrefix = 'guild-sanctuary:settings:v1:';
const appearanceStoragePrefix = 'sanctuary:appearance:v1:';
type AppearancePreferences = Pick<AccountPreferences, 'theme' | 'layout'>;

export const defaultAccountPreferences: AccountPreferences = {
  allowProfileDiscovery: true,
  allowDirectMessages: true,
  showOnlineStatus: false,
  emailNotifications: true,
  personalizedFeed: true,
  layout: 'comfortable',
  theme: 'dark',
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


export function fetchLocalAppearancePreferences(userId: string): AppearancePreferences {
  const defaults: AppearancePreferences = { theme: defaultAccountPreferences.theme, layout: defaultAccountPreferences.layout };
  if (!userId || typeof window === 'undefined') return defaults;
  try {
    const raw = getStorage().getItem(appearanceStoragePrefix + userId);
    if (!raw) return defaults;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return defaults;
    return {
      theme: value.theme === 'system' || value.theme === 'light' || value.theme === 'dark' || value.theme === 'dusk' || value.theme === 'stone' || value.theme === 'ocean' || value.theme === 'midnight' || value.theme === 'forest' || value.theme === 'rose' || value.theme === 'lavender' || value.theme === 'ember' || value.theme === 'mint' ? value.theme : defaults.theme,
      layout: value.layout === 'compact' ? 'compact' : value.layout === 'comfortable' ? 'comfortable' : defaults.layout,
    };
  } catch { return defaults; }
}

export function saveLocalAppearancePreferences(userId: string, preferences: AppearancePreferences): void {
  if (!userId) throw new Error('Sign in before changing appearance settings.');
  if (!['system', 'light', 'dark', 'dusk', 'stone', 'ocean', 'midnight', 'forest', 'rose', 'lavender', 'ember', 'mint'].includes(preferences.theme)) throw new Error('Choose a supported Sanctuary theme.');
  if (preferences.layout !== 'comfortable' && preferences.layout !== 'compact') throw new Error('Choose a supported layout arrangement.');
  try {
    getStorage().setItem(appearanceStoragePrefix + userId, JSON.stringify(preferences));
    getStorage().setItem('sanctuary-theme', preferences.theme);
  } catch { throw new Error('Appearance could not be saved on this device. Check your browser storage settings.'); }
}

async function hasMatchingSupabaseUser(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseBrowserClient().auth.getUser();
  if (error) throw new Error(`Your account session could not be verified: ${error.message}`);
  if (!data.user) return false;
  if (data.user.id !== userId) {
    throw new Error('Your active Sanctuary session does not match these settings. Sign out and sign in again.');
  }
  return true;
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
    theme: record.theme === 'system' || record.theme === 'light' || record.theme === 'dark' || record.theme === 'dusk' || record.theme === 'stone' || record.theme === 'ocean' || record.theme === 'midnight' || record.theme === 'forest' || record.theme === 'rose' || record.theme === 'lavender' || record.theme === 'ember' || record.theme === 'mint' ? record.theme : 'dark',
  };
}

export async function fetchAccountSettings(userId: string): Promise<AccountSettings> {
  if (!userId) {
    throw new Error('Sign in to view account settings.');
  }
  if (isSupabaseCommunityStorageConfigured()) {
    if (!(await hasMatchingSupabaseUser(userId))) {
      throw new Error('Sign in with the connected Sanctuary account to view account settings.');
    }
    const { data, error } = await getSupabaseBrowserClient().from('account_settings')
      .select('preferences,updated_at').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(`Account settings could not be loaded from your account: ${error.message}`);
    if (data) return { userId, preferences: normalizePreferences(data.preferences), updatedAt: data.updated_at };
    const preferences = { ...defaultAccountPreferences };
    const { data: created, error: createError } = await getSupabaseBrowserClient().from('account_settings')
      .upsert({ user_id: userId, preferences: { ...preferences } as Record<string, unknown> }, { onConflict: 'user_id' })
      .select('preferences,updated_at').single();
    if (createError) throw new Error(`Account settings could not be initialized: ${createError.message}`);
    return { userId, preferences: normalizePreferences(created.preferences), updatedAt: created.updated_at };
  }
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

export async function saveAccountPreferences(userId: string, preferences: AccountPreferences): Promise<AccountSettings> {
  if (!userId) {
    throw new Error('Sign in before changing account settings.');
  }
  if (preferences.layout !== 'comfortable' && preferences.layout !== 'compact') {
    throw new Error('Choose a supported layout arrangement.');
  }
  if (!['system', 'light', 'dark', 'dusk', 'stone', 'ocean', 'midnight', 'forest', 'rose', 'lavender', 'ember', 'mint'].includes(preferences.theme)) {
    throw new Error('Choose a supported Sanctuary theme.');
  }
  if (isSupabaseCommunityStorageConfigured()) {
    if (!(await hasMatchingSupabaseUser(userId))) {
      throw new Error('Sign in with the connected Sanctuary account to save account settings.');
    }
    const { data, error } = await getSupabaseBrowserClient().from('account_settings')
      .upsert({ user_id: userId, preferences: { ...preferences } as Record<string, unknown>, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('preferences,updated_at').single();
    if (error) throw new Error(`Account settings could not be saved to your account: ${error.message}`);
    return { userId, preferences: normalizePreferences(data.preferences), updatedAt: data.updated_at };
  }
  const settings: AccountSettings = {
    userId,
    preferences,
    updatedAt: new Date().toISOString(),
  };
  try {
    getStorage().setItem(`${storagePrefix}${userId}`, JSON.stringify(settings));
  } catch {
    throw new Error('Account settings could not be saved in this browser.');
  }
  return settings;
}

export function removeAccountSettings(userId: string): void {
  try {
    getStorage().removeItem(`${storagePrefix}${userId}`);
  } catch {
    throw new Error('Saved account settings could not be removed from this browser.');
  }
}
