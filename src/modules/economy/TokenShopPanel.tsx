'use client';

import { useCallback, useEffect, useState } from 'react';
import { LockKeyhole, ShoppingBag, Sparkles } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { canAccessSanctuaryFeature } from '@/lib/sanctuaryFeatureGates';
import { isSupabaseWalletConfigured } from './service';
import styles from './TokenShopPanel.module.css';

type ShopItem = {
  item_id: string;
  name: string;
  description: string;
  price_tokens: number;
  kind: string;
  asset_url: string | null;
  asset_text: string | null;
  effect_key: string | null;
  sort_order: number;
};

interface TokenShopPanelProps {
  userId: string;
  isGuest: boolean;
  role: string;
}

// Central release gate keeps redemption disabled until owner-approved staging tests pass.
export function TokenShopPanel({ userId, isGuest, role }: TokenShopPanelProps) {
  const spendingEnabled = canAccessSanctuaryFeature('tokenSpending', role);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hasSupabaseAccount = !isGuest && isSupabaseWalletConfigured();

  const loadShop = useCallback(async (cancelled?: () => boolean) => {
    if (!hasSupabaseAccount) {
      setItems([]);
      setOwnedItems(new Set());
      setBalance(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || authData.user?.id !== userId) {
        throw new Error('Sign in with your connected Sanctuary account to view your shop inventory.');
      }

      const [catalogResult, entitlementsResult, walletResult] = await Promise.all([
        client.from('token_spend_catalog')
          .select('item_id,name,description,price_tokens,kind,asset_url,asset_text,effect_key,sort_order')
          .eq('enabled', true)
          .order('sort_order', { ascending: true }),
        client.from('token_entitlements').select('item_id').eq('user_id', userId),
        client.from('token_wallets').select('balance_tokens').eq('user_id', userId).maybeSingle(),
      ]);

      if (catalogResult.error) throw catalogResult.error;
      if (entitlementsResult.error) throw entitlementsResult.error;
      if (walletResult.error) throw walletResult.error;
      if (cancelled?.()) return;

      setItems((catalogResult.data ?? []) as ShopItem[]);
      setOwnedItems(new Set((entitlementsResult.data ?? []).map((item) => item.item_id)));
      setBalance(walletResult.data?.balance_tokens ?? 0);
      setError(null);
    } catch (loadError) {
      if (!cancelled?.()) {
        setError(loadError instanceof Error ? loadError.message : 'The token shop could not be loaded.');
      }
    } finally {
      if (!cancelled?.()) setIsLoading(false);
    }
  }, [hasSupabaseAccount, userId]);

  useEffect(() => {
    let cancelled = false;
    void loadShop(() => cancelled);
    return () => { cancelled = true; };
  }, [loadShop]);

  const purchaseItem = async (item: ShopItem) => {
    if (!spendingEnabled || isGuest || !hasSupabaseAccount || purchasingItemId || ownedItems.has(item.item_id)) return;

    setPurchasingItemId(item.item_id);
    setError(null);
    setNotice(null);
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || authData.user?.id !== userId) {
        throw new Error('Your signed-in account could not be verified. Please sign in again.');
      }

      // The RPC performs the authoritative balance, catalogue, entitlement and ledger checks.
      // Never deduct tokens or grant cosmetics in the browser.
      const { data, error: spendError } = await client.rpc('spend_tokens', {
        requested_item_id: item.item_id,
        requested_idempotency_key: crypto.randomUUID(),
      });
      if (spendError) {
        const message = spendError.message.toLowerCase();
        if (message.includes('insufficient') || message.includes('balance')) {
          throw new Error('You do not have enough tokens for this item.');
        }
        if (message.includes('already owned') || message.includes('entitlement')) {
          throw new Error('This item is already in your collection. Refreshing your inventory.');
        }
        if (message.includes('active user') || message.includes('sign in') || message.includes('authentication')) {
          throw new Error('An active, signed-in Sanctuary account is required to spend tokens.');
        }
        throw new Error('The purchase could not be completed. No success was reported; refresh your shop and try again.');
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result || typeof result.balance_tokens !== 'number' && typeof result.balance_tokens !== 'string') {
        throw new Error('The purchase response could not be verified. Refresh your wallet before trying again.');
      }
      setBalance(Number(result.balance_tokens));
      setOwnedItems((previous) => new Set(previous).add(item.item_id));
      setNotice(result.already_applied
        ? `${item.name} is already in your collection.`
        : `${item.name} unlocked successfully.`);
      await loadShop();
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : 'The purchase could not be completed.');
    } finally {
      setPurchasingItemId(null);
    }
  };

  return (
    <main className={styles.shop}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>THE SANCTUARY COLLECTION</p>
          <h1>Token Shop</h1>
          <p>Unlock first-party profile cosmetics with Sanctuary Tokens. Items are account-bound and cannot be traded or cashed out.</p>
        </div>
        <div className={styles.balance}>
          <span>Wallet balance</span>
          <strong>{balance === null ? '—' : `${balance.toLocaleString('en-GB')} tokens`}</strong>
        </div>
      </header>

      <div className={styles.releaseNotice} role="status">
        <LockKeyhole size={18} aria-hidden="true" />
        <div>
          <strong>Token redemption is locked while staging checks are pending</strong>
          <p>Purchasing is intentionally disabled until the owner reviews the database permission migration and the isolated staging tests confirm balance, idempotency, ownership, and ledger consistency. The browser never deducts tokens or grants items.</p>
        </div>
      </div>

      {isGuest && <p className={styles.status}>Guest mode can explore The Sanctuary, but personal balances and owned items require a signed-in account.</p>}
      {!isGuest && !hasSupabaseAccount && <p className={styles.status}>Connect a Sanctuary account to view your balance and inventory.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.status} role="status">{notice}</p>}
      {isLoading ? (
        <p className={styles.status} role="status">Loading shop items…</p>
      ) : items.length === 0 ? (
        <p className={styles.status}>No shop items are currently enabled in the catalogue. The shop will display items once the database catalogue is available.</p>
      ) : (
        <section className={styles.grid} aria-label="Cosmetic catalogue">
          {items.map((item) => {
            const owned = ownedItems.has(item.item_id);
            const purchasing = purchasingItemId === item.item_id;
            return (
              <article className={styles.card} key={item.item_id}>
                <div className={styles.art} aria-hidden="true">
                  {item.asset_text ? <span>{item.asset_text}</span> : <Sparkles size={34} strokeWidth={1.2} />}
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.kind}>{item.kind.replaceAll('_', ' ')}</p>
                  <h2>{item.name}</h2>
                  <p className={styles.description}>{item.description}</p>
                  <div className={styles.cardFooter}>
                    <strong>{item.price_tokens.toLocaleString('en-GB')} tokens</strong>
                    <button
                      type="button"
                      disabled={!spendingEnabled || !hasSupabaseAccount || owned || purchasingItemId !== null}
                      onClick={() => void purchaseItem(item)}
                      className={styles.buyButton}
                    >
                      {owned ? 'Owned' : !spendingEnabled ? 'Coming soon' : purchasing ? 'Unlocking…' : 'Unlock item'}
                    </button>
                  </div>
                  {owned && <p className={styles.ownedNote}>Already in your account collection.</p>}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <p className={styles.footerNote}><ShoppingBag size={15} aria-hidden="true" /> Prices and eligibility come from the server-owned catalogue. Your balance changes only after the database confirms a successful redemption.</p>
    </main>
  );
}
