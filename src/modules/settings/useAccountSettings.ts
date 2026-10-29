'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AccountPreferences, AccountSettings } from '@/types/database';
import { defaultAccountPreferences, fetchAccountSettings, fetchLocalAppearancePreferences, saveAccountPreferences, saveLocalAppearancePreferences } from './service';

export function useAccountSettings(userId: string) {
  const [settings, setSettings] = useState<AccountSettings>({
    userId,
    preferences: defaultAccountPreferences,
    updatedAt: new Date(0).toISOString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [localAppearanceOnly, setLocalAppearanceOnly] = useState(false);
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
      if (!cancelled) { setSettings(saved); setLoadedUserId(userId); setLocalAppearanceOnly(false); setError(null); }
    }).catch((loadError) => {
      if (!cancelled) {
        const appearance = fetchLocalAppearancePreferences(userId);
        setSettings({ userId, preferences: { ...defaultAccountPreferences, ...appearance }, updatedAt: new Date(0).toISOString() });
        setLoadedUserId(userId);
        setLocalAppearanceOnly(true);
        const detail = loadError instanceof Error ? loadError.message : 'Account settings could not be loaded.';
        setError('Account settings could not sync (' + detail + '). Appearance can still be changed on this device; privacy and account preferences still require a working connection.');
      }
    }).finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const updatePreferences = useCallback(async (updates: Partial<AccountPreferences>) => {
    if (!userId || loadedUserId !== userId || isLoading || settings.userId !== userId) {
      throw new Error('Account settings are still loading for the active account. Please try again.');
    }
    const preferences = { ...settings.preferences, ...updates };
    if (localAppearanceOnly) {
      const keys = Object.keys(updates);
      if (keys.length === 0 || keys.some((key) => key !== 'theme' && key !== 'layout')) {
        throw new Error('Account settings cannot sync right now. Only appearance changes can be saved on this device; privacy changes need the account connection.');
      }
      saveLocalAppearancePreferences(userId, { theme: preferences.theme, layout: preferences.layout });
      const saved = { userId, preferences, updatedAt: new Date().toISOString() };
      setSettings(saved);
      setError('Saved on this device only. Account settings are still not syncing, so this appearance choice will not follow you to other devices yet.');
      return saved;
    }
    try {
      const saved = await saveAccountPreferences(userId, preferences);
      saveLocalAppearancePreferences(userId, { theme: saved.preferences.theme, layout: saved.preferences.layout });
      setSettings(saved);
      setError(null);
      return saved;
    } catch (saveError) {
      const keys = Object.keys(updates);
      if (keys.length > 0 && keys.every((key) => key === 'theme' || key === 'layout')) {
        saveLocalAppearancePreferences(userId, { theme: preferences.theme, layout: preferences.layout });
        const localSaved = { userId, preferences, updatedAt: new Date().toISOString() };
        setSettings(localSaved);
        setLocalAppearanceOnly(true);
        const detail = saveError instanceof Error ? saveError.message : 'The account settings service is unavailable.';
        setError('Account sync failed (' + detail + '). Appearance was saved on this device only; privacy and account preferences still require a working connection.');
        return localSaved;
      }
      throw saveError;
    }
  }, [isLoading, loadedUserId, settings.preferences, settings.userId, userId]);

  const visibleSettings = settings.userId === userId ? settings : {
    userId,
    preferences: defaultAccountPreferences,
    updatedAt: new Date(0).toISOString(),
  };

  return { settings: visibleSettings, isLoading, error, updatePreferences, setError };
}
