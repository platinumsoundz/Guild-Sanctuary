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
    try {
      setSettings(fetchAccountSettings(userId));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Account settings could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updatePreferences = useCallback((updates: Partial<AccountPreferences>) => {
    const preferences = { ...settings.preferences, ...updates };
    const saved = saveAccountPreferences(userId, preferences);
    setSettings(saved);
    setError(null);
    return saved;
  }, [settings.preferences, userId]);

  return { settings, isLoading, error, updatePreferences, setError };
}
