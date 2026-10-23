'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  checkTokenCheckoutEnabled,
  fetchWallet,
  isSupabaseWalletConfigured,
  startTokenCheckout,
  tokenBundles,
  type TokenBundle,
  type TokenBundleId,
  type WalletSnapshot,
} from './service';

interface UseWalletResult {
  snapshot: WalletSnapshot | null;
  bundles: TokenBundle[];
  checkoutEnabled: boolean;
  isLoading: boolean;
  isStartingCheckout: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  buyBundle: (bundleId: TokenBundleId) => Promise<void>;
}

export function useWallet(userId: string, isGuest: boolean): UseWalletResult {
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return {
    snapshot,
    bundles: tokenBundles,
    checkoutEnabled,
    isLoading,
    isStartingCheckout,
    error,
    refresh,
    buyBundle,
  };
}
