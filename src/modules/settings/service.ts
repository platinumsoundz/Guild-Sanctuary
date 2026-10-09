import type { AccountPreferences, AccountSettings } from '@/types/database';

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

export function fetchAccountSettings(userId: string): AccountSettings {
  if (!userId) {
    throw new Error('Sign in to view account settings.');
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

export function saveAccountPreferences(userId: string, preferences: AccountPreferences): AccountSettings {
  if (!userId) {
    throw new Error('Sign in before changing account settings.');
  }
  if (preferences.layout !== 'comfortable' && preferences.layout !== 'compact') {
    throw new Error('Choose a supported layout arrangement.');
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
