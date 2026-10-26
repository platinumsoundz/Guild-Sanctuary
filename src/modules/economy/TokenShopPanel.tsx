'use client';

import { useEffect, useState } from 'react';
import { LockKeyhole, ShoppingBag, Sparkles } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
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
  onOpenWallet?: () => void;
}

export function TokenShopPanel({ userId, isGuest, onOpenWallet }: TokenShopPanelProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasSupabaseAccount = !isGuest && isSupabaseWalletConfigured();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
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
        if (cancelled) return;

        setItems((catalogResult.data ?? []) as ShopItem[]);
        setOwnedItems(new Set((entitlementsResult.data ?? []).map((item) => item.item_id)));
        setBalance(walletResult.data?.balance_tokens ?? 0);
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'The token shop could not be loaded.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [hasSupabaseAccount, userId]);

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
          <strong>Shop preview — purchases happen in Wallet</strong>
          <p>This page mirrors the server-owned catalogue. Token spending, equipping, and removal live in Wallet so every purchase goes through the age-gated flow. No tokens are deducted from this screen.</p>
        </div>
      </div>

      {isGuest && <p className={styles.status}>Guest mode can explore The Sanctuary, but personal balances and owned items require a signed-in account.</p>}
      {!isGuest && !hasSupabaseAccount && <p className={styles.status}>Connect a Sanctuary account to view your balance and inventory.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {isLoading ? (
        <p className={styles.status} role="status">Loading shop items…</p>
      ) : items.length === 0 ? (
        <p className={styles.status}>The live catalogue is only available to a connected Sanctuary account.</p>
      ) : (
        <section className={styles.grid} aria-label="Cosmetic catalogue">
          {items.map((item) => {
            const owned = ownedItems.has(item.item_id);
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
                      disabled={owned || !onOpenWallet}
                      className={styles.buyButton}
                      onClick={onOpenWallet}
                    >
                      {owned ? 'Owned' : 'Open Wallet'}
                    </button>
                  </div>
                  {owned && <p className={styles.ownedNote}>Already in your account collection.</p>}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <p className={styles.footerNote}><ShoppingBag size={15} aria-hidden="true" /> Token prices are read from the server-owned catalogue. Purchases and equipping happen in Wallet.</p>
    </main>
  );
}
