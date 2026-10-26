'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCosmeticSlot } from './catalog';
import {
  checkTokenCheckoutEnabled,
  clearProfileCosmetic,
  confirmTokenPurchaseAge,
  equipProfileCosmetic,
  fetchWallet,
  isSupabaseWalletConfigured,
  spendTokens,
  startTokenCheckout,
  tokenBundles,
  type TokenBundle,
  type TokenBundleId,
  type TokenEntitlement,
  type TokenSpendItem,
  type TokenSpendItemKind,
  type TokenSpendResult,
  type WalletSnapshot,
} from './service';

interface UseWalletResult {
  snapshot: WalletSnapshot | null;
  bundles: TokenBundle[];
  catalog: TokenSpendItem[];
  entitlements: TokenEntitlement[];
  checkoutEnabled: boolean;
  ageVerified: boolean;
  isLoading: boolean;
  isStartingCheckout: boolean;
  isConfirmingAge: boolean;
  spendingItemId: string | null;
  equippingItemId: string | null;
  clearingItemId: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  confirmAge: (dateOfBirth: string) => Promise<boolean>;
  buyBundle: (bundleId: TokenBundleId) => Promise<void>;
  spendItem: (itemId: string) => Promise<TokenSpendResult | null>;
  equipItem: (itemId: string) => Promise<boolean>;
  clearItem: (itemId: string, kind: TokenSpendItemKind) => Promise<boolean>;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error('This browser cannot create a secure spend request. Update your browser and try again.');
}

export function useWallet(userId: string, isGuest: boolean, initialAgeVerifiedAt: string | null = null): UseWalletResult {
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [ageVerifiedAt, setAgeVerifiedAt] = useState<string | null>(initialAgeVerifiedAt);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [isConfirmingAge, setIsConfirmingAge] = useState(false);
  const [spendingItemId, setSpendingItemId] = useState<string | null>(null);
  const [equippingItemId, setEquippingItemId] = useState<string | null>(null);
  const [clearingItemId, setClearingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingSpendKeys = useRef<Record<string, string>>({});
  const canUseWallet = !isGuest && isSupabaseWalletConfigured();

  useEffect(() => {
    setAgeVerifiedAt(initialAgeVerifiedAt);
  }, [initialAgeVerifiedAt]);

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

  const confirmAge = async (dateOfBirth: string): Promise<boolean> => {
    if (!canUseWallet) {
      setError('Sign in with your Sanctuary account before confirming your age.');
      return false;
    }
    setIsConfirmingAge(true);
    setError(null);
    try {
      const verifiedAt = await confirmTokenPurchaseAge(userId, dateOfBirth);
      setAgeVerifiedAt(verifiedAt);
      return true;
    } catch (ageError) {
      setError(ageError instanceof Error ? ageError.message : 'Your age could not be verified.');
      return false;
    } finally {
      setIsConfirmingAge(false);
    }
  };

  const buyBundle = async (bundleId: TokenBundleId) => {
    if (!canUseWallet || !checkoutEnabled) {
      setError('Secure token checkout is still being configured.');
      return;
    }
    if (!ageVerifiedAt) {
      setError('Confirm that you are 18 or older before buying tokens.');
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

  const equipItem = async (itemId: string): Promise<boolean> => {
    if (!canUseWallet) {
      setError('Sign in with your Sanctuary account before equipping cosmetics.');
      return false;
    }

    setEquippingItemId(itemId);
    setError(null);
    try {
      await equipProfileCosmetic(userId, itemId);
      await refresh();
      return true;
    } catch (equipError) {
      setError(equipError instanceof Error ? equipError.message : 'The cosmetic could not be equipped.');
      return false;
    } finally {
      setEquippingItemId(null);
    }
  };

  const clearItem = async (itemId: string, kind: TokenSpendItemKind): Promise<boolean> => {
    if (!canUseWallet) {
      setError('Sign in with your Sanctuary account before changing cosmetics.');
      return false;
    }

    const slot = getCosmeticSlot(kind);
    if (!slot) {
      setError('That item cannot be removed from a profile slot.');
      return false;
    }

    setClearingItemId(itemId);
    setError(null);
    try {
      await clearProfileCosmetic(userId, slot);
      await refresh();
      return true;
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'The cosmetic could not be removed.');
      return false;
    } finally {
      setClearingItemId(null);
    }
  };

  return {
    snapshot,
    bundles: tokenBundles,
    catalog: snapshot?.catalog ?? [],
    entitlements: snapshot?.entitlements ?? [],
    checkoutEnabled,
    ageVerified: Boolean(ageVerifiedAt),
    isLoading,
    isStartingCheckout,
    isConfirmingAge,
    spendingItemId,
    equippingItemId,
    clearingItemId,
    error,
    refresh,
    confirmAge,
    buyBundle,
    spendItem,
    equipItem,
    clearItem,
  };
}
