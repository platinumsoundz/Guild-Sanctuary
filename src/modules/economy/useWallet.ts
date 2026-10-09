'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  completeStripeCheckoutMock,
  createStripeCheckoutMock,
  equipInventoryItem,
  fetchCosmeticCatalog,
  fetchCreditPackages,
  fetchWallet,
  purchaseCosmetic,
  purchaseVipTier,
  type CosmeticProduct,
  type CreditPackage,
  type MockCheckoutSession,
  type VipTier,
  type WalletSnapshot,
} from './service';

interface UseWalletResult {
  snapshot: WalletSnapshot | null;
  packages: CreditPackage[];
  catalog: CosmeticProduct[];
  checkout: MockCheckoutSession | null;
  isLoading: boolean;
  error: string | null;
  beginTopUp: (packageId: string) => Promise<void>;
  completeTopUp: () => Promise<void>;
  unlock: (productId: string) => Promise<void>;
  upgradeVip: (tier: Exclude<VipTier, 'free'>) => Promise<void>;
  equip: (inventoryItemId: string) => Promise<void>;
}

export function useWallet(userId: string): UseWalletResult {
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [catalog, setCatalog] = useState<CosmeticProduct[]>([]);
  const [checkout, setCheckout] = useState<MockCheckoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [walletSnapshot, availablePackages, availableProducts] = await Promise.all([
        fetchWallet(userId),
        fetchCreditPackages(),
        fetchCosmeticCatalog(),
      ]);
      setSnapshot(walletSnapshot);
      setPackages(availablePackages);
      setCatalog(availableProducts);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The wallet could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const beginTopUp = async (packageId: string) => {
    try {
      setCheckout(await createStripeCheckoutMock(userId, packageId));
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Checkout could not be started.');
    }
  };

  const completeTopUp = async () => {
    if (!checkout) {
      return;
    }
    try {
      setSnapshot(await completeStripeCheckoutMock(userId, checkout.id));
      setCheckout(null);
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Checkout could not be completed.');
    }
  };

  const updateSnapshot = async (action: () => Promise<WalletSnapshot>) => {
    try {
      setSnapshot(await action());
      setError(null);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Wallet action could not be completed.');
    }
  };

  return {
    snapshot,
    packages,
    catalog,
    checkout,
    isLoading,
    error,
    beginTopUp,
    completeTopUp,
    unlock: (productId) => updateSnapshot(() => purchaseCosmetic(userId, productId)),
    upgradeVip: (tier) => updateSnapshot(() => purchaseVipTier(userId, tier)),
    equip: (inventoryItemId) => updateSnapshot(() => equipInventoryItem(userId, inventoryItemId)),
  };
}