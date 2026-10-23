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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setError('Sign in to manage account settings.');
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void fetchAccountSettings(userId)
      .then((loaded) => {
        if (cancelled) return;
        setSettings(loaded);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : 'Account settings could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const updatePreferences = useCallback(async (updates: Partial<AccountPreferences>) => {
    const preferences = { ...settings.preferences, ...updates };
    const saved = await saveAccountPreferences(userId, preferences);
    setSettings(saved);
    setError(null);
    return saved;
  }, [settings.preferences, userId]);

  return { settings, isLoading, error, updatePreferences, setError };
}
