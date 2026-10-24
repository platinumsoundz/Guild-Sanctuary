'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkTokenCheckoutEnabled,
  fetchWallet,
  isSupabaseWalletConfigured,
  spendTokens,
  startTokenCheckout,
  tokenBundles,
  type TokenBundle,
  type TokenBundleId,
  type TokenEntitlement,
  type TokenSpendItem,
  type TokenSpendResult,
  type WalletSnapshot,
} from './service';

interface UseWalletResult {
  snapshot: WalletSnapshot | null;
  bundles: TokenBundle[];
  catalog: TokenSpendItem[];
  entitlements: TokenEntitlement[];
  checkoutEnabled: boolean;
  isLoading: boolean;
  isStartingCheckout: boolean;
  spendingItemId: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  buyBundle: (bundleId: TokenBundleId) => Promise<void>;
  spendItem: (itemId: string) => Promise<TokenSpendResult | null>;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error('This browser cannot create a secure spend request. Update your browser and try again.');
}

export function useWallet(userId: string, isGuest: boolean): UseWalletResult {
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [spendingItemId, setSpendingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingSpendKeys = useRef<Record<string, string>>({});
  const canUseWallet = !isGuest && isSupabaseWalletConfigured();

  const refresh = useCallback(async () => {
    if (!canUseWallet) {
      setSnapshot(null);
      setCheckoutEnabled(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [wallet, enabled] = await Promise.all([
        fetchWallet(userId),
        checkTokenCheckoutEnabled(userId).catch(() => false),
      ]);
      setSnapshot(wallet);
      setCheckoutEnabled(enabled);
      setError(null);
    } catch (loadError) {
      setSnapshot(null);
      setCheckoutEnabled(false);
      setError(loadError instanceof Error ? loadError.message : 'The token wallet could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [canUseWallet, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const buyBundle = async (bundleId: TokenBundleId) => {
    if (!canUseWallet || !checkoutEnabled) {
      setError('Secure token checkout is still being configured.');
      return;
    }
    setIsStartingCheckout(true);
    setError(null);
    try {
      const checkoutUrl = await startTokenCheckout(userId, bundleId);
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Token checkout could not be started.');
      setIsStartingCheckout(false);
    }
  };

  const spendItem = async (itemId: string): Promise<TokenSpendResult | null> => {
    if (!canUseWallet) {
      setError('Sign in with your Sanctuary account before spending tokens.');
      return null;
    }

    setSpendingItemId(itemId);
    setError(null);
    try {
      const idempotencyKey = pendingSpendKeys.current[itemId] ?? createIdempotencyKey();
      pendingSpendKeys.current[itemId] = idempotencyKey;
      const result = await spendTokens(userId, itemId, idempotencyKey);
      delete pendingSpendKeys.current[itemId];
      await refresh();
      return result;
    } catch (spendError) {
      // Keep the idempotency key so a retry cannot double-spend after a timeout.
      setError(spendError instanceof Error ? spendError.message : 'The tokens could not be spent.');
      return null;
    } finally {
      setSpendingItemId(null);
    }
  };

  return {
    snapshot,
    bundles: tokenBundles,
    catalog: snapshot?.catalog ?? [],
    entitlements: snapshot?.entitlements ?? [],
    checkoutEnabled,
    isLoading,
    isStartingCheckout,
    spendingItemId,
    error,
    refresh,
    buyBundle,
    spendItem,
  };
}
