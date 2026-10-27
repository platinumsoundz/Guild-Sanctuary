'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AccountPreferences, AccountSettings } from '@/types/database';
import { defaultAccountPreferences, fetchAccountSettings, saveAccountPreferences } from './service';

export function useAccountSettings(userId: string) {
  const [settings, setSettings] = useState<AccountSettings>({
    userId,
    preferences: defaultAccountPreferences,
    updatedAt: new Date(0).toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoadedUserId(null);
    setIsLoading(true);
    setError(null);
    if (!userId) {
      setIsLoading(false);
      setError('Sign in to manage account settings.');
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchAccountSettings(userId).then((saved) => {
      if (!cancelled) { setSettings(saved); setLoadedUserId(userId); setError(null); }
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Account settings could not be loaded.');
    }).finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const updatePreferences = useCallback(async (updates: Partial<AccountPreferences>) => {
    if (!userId || loadedUserId !== userId || isLoading || settings.userId !== userId) {
      throw new Error('Account settings are still loading for the active account. Please try again.');
    }
    const preferences = { ...settings.preferences, ...updates };
    const saved = await saveAccountPreferences(userId, preferences);
    setSettings(saved);
    setError(null);
    return saved;
  }, [isLoading, loadedUserId, settings.preferences, settings.userId, userId]);

  const visibleSettings = settings.userId === userId ? settings : {
    userId,
    preferences: defaultAccountPreferences,
    updatedAt: new Date(0).toISOString(),
  };

  return { settings: visibleSettings, isLoading, error, updatePreferences, setError };
}
