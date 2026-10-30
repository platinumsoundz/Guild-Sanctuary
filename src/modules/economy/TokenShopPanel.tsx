'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, LockKeyhole, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseWalletConfigured } from './service';
import type { WorldType } from '@/types/database';
import styles from './TokenShopPanel.module.css';

type ShopItem = {
  item_id: string;
  name: string;
  description: string;
  price_tokens: number;
  kind: string;
  enabled: boolean;
  asset_url: string | null;
  asset_text: string | null;
  effect_key: string | null;
  sort_order: number;
};

interface TokenShopPanelProps {
  userId: string;
  isGuest: boolean;
  worldType?: WorldType;
}

// Keep redemption disabled until owner-approved migration and staging ledger tests pass.
const SPENDING_ENABLED = false;
const EQUIPPING_ENABLED = false;

export function TokenShopPanel({ userId, isGuest, worldType = 'sanctuary' }: TokenShopPanelProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState<number | null>(null);
  const [equippedSlots, setEquippedSlots] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [equippingItemId, setEquippingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const hasSupabaseAccount = !isGuest && isSupabaseWalletConfigured();

  const loadShop = useCallback(async (cancelled?: () => boolean) => {
    if (!isSupabaseWalletConfigured()) {
      setItems([]);
      setOwnedItems(new Set());
      setBalance(null);
      setEquippedSlots({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const client = getSupabaseBrowserClient();
      if (isGuest) {
        const { data, error: catalogError } = await client.from('token_spend_catalog')
          .select('item_id,name,description,price_tokens,kind,enabled,asset_url,asset_text,effect_key,sort_order')
          .eq('enabled', true).order('sort_order', { ascending: true });
        if (catalogError) throw catalogError;
        if (cancelled?.()) return;
        setItems((data ?? []) as ShopItem[]);
        setOwnedItems(new Set());
        setBalance(null);
        setEquippedSlots({});
        setError(null);
        return;
      }
      if (!hasSupabaseAccount) {
        setItems([]);
        setOwnedItems(new Set());
        setBalance(null);
        setEquippedSlots({});
        return;
      }
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || authData.user?.id !== userId) {
        throw new Error('Sign in to view your shop inventory.');
      }

      const [catalogResult, entitlementsResult, walletResult, profileResult] = await Promise.all([
        client.from('token_spend_catalog')
          .select('item_id,name,description,price_tokens,kind,enabled,asset_url,asset_text,effect_key,sort_order')
          .order('sort_order', { ascending: true }),
        client.from('token_entitlements').select('item_id').eq('user_id', userId),
        client.from('token_wallets').select('balance_tokens').eq('user_id', userId).maybeSingle(),
        client.from('profiles').select('equipped_frame,equipped_effect,equipped_badge,equipped_banner,equipped_border,equipped_profile_theme,equipped_palette').eq('id', userId).maybeSingle(),
      ]);

      if (catalogResult.error) throw catalogResult.error;
      if (entitlementsResult.error) throw entitlementsResult.error;
      if (walletResult.error) throw walletResult.error;
      if (profileResult.error) throw profileResult.error;
      if (cancelled?.()) return;

      setItems((catalogResult.data ?? []) as ShopItem[]);
      setOwnedItems(new Set((entitlementsResult.data ?? []).map((item) => item.item_id)));
      setBalance(walletResult.data?.balance_tokens ?? 0);
      setEquippedSlots({
        profile_frame: profileResult.data?.equipped_frame ?? null,
        profile_effect: profileResult.data?.equipped_effect ?? null,
        profile_badge: profileResult.data?.equipped_badge ?? null,
        profile_banner: profileResult.data?.equipped_banner ?? null,
        profile_border: profileResult.data?.equipped_border ?? null,
        profile_theme: profileResult.data?.equipped_profile_theme ?? null,
        colour_palette: profileResult.data?.equipped_palette ?? null,
      });
      setError(null);
    } catch (loadError) {
      if (!cancelled?.()) {
        setError(loadError instanceof Error ? loadError.message : 'The token shop could not be loaded.');
      }
    } finally {
      if (!cancelled?.()) setIsLoading(false);
    }
  }, [hasSupabaseAccount, isGuest, userId]);

  const categories = useMemo(() => Array.from(new Set(items.filter((item) => item.enabled).map((item) => item.kind))).sort(), [items]);
  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!item.enabled) return false;
      const matchesCategory = activeCategory === 'all' || item.kind === activeCategory;
      const matchesOwned = !ownedOnly || ownedItems.has(item.item_id);
      const matchesSearch = !query || `${item.name} ${item.description} ${item.kind}`.toLowerCase().includes(query);
      return matchesCategory && matchesOwned && matchesSearch;
    });
  }, [activeCategory, items, ownedItems, ownedOnly, search]);

  useEffect(() => {
    let cancelled = false;
    void loadShop(() => cancelled);
    return () => { cancelled = true; };
  }, [loadShop]);

  const equipItem = async (item: ShopItem) => {
    if (!EQUIPPING_ENABLED || !hasSupabaseAccount || !ownedItems.has(item.item_id) || equippingItemId) return;
    setEquippingItemId(item.item_id);
    setError(null);
    setNotice(null);
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || authData.user?.id !== userId) throw new Error('Sign in again before changing profile cosmetics.');
      const { error: equipError } = await client.rpc('equip_profile_cosmetic', { requested_item_id: item.item_id });
      if (equipError) throw new Error(equipError.message.includes('review') ? equipError.message : 'This cosmetic could not be equipped. Refresh your collection and try again.');
      setEquippedSlots((previous) => ({ ...previous, [item.kind]: item.item_id }));
      setNotice(`${item.name} is now equipped on your profile.`);
      await loadShop();
    } catch (equipError) {
      setError(equipError instanceof Error ? equipError.message : 'This cosmetic could not be equipped.');
    } finally {
      setEquippingItemId(null);
    }
  };

  const unequipItem = async (item: ShopItem) => {
    if (!EQUIPPING_ENABLED || !hasSupabaseAccount || equippingItemId) return;
    const slots: Record<string, 'frame' | 'effect' | 'badge' | 'banner' | 'border' | 'profile_theme' | 'palette'> = {
      profile_frame: 'frame', profile_effect: 'effect', profile_badge: 'badge', profile_banner: 'banner',
      profile_border: 'border', profile_theme: 'profile_theme', colour_palette: 'palette',
    };
    const slot = slots[item.kind];
    if (!slot) return;
    setEquippingItemId(item.item_id);
    setError(null);
    setNotice(null);
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || authData.user?.id !== userId) throw new Error('Sign in again before changing profile cosmetics.');
      const { error: clearError } = await client.rpc('clear_profile_cosmetic', { requested_slot: slot });
      if (clearError) throw new Error('This cosmetic could not be removed. Refresh your collection and try again.');
      setEquippedSlots((previous) => ({ ...previous, [item.kind]: null }));
      setNotice(`${item.name} has been removed from your profile.`);
      await loadShop();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'This cosmetic could not be removed.');
    } finally {
      setEquippingItemId(null);
    }
  };

  const purchaseItem = async (item: ShopItem) => {
    if (!SPENDING_ENABLED || isGuest || !hasSupabaseAccount || purchasingItemId || ownedItems.has(item.item_id)) return;

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
          throw new Error('An active, signed-in account is required to spend tokens.');
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
          <p className={styles.eyebrow}>{worldType === 'guild' ? 'THE GUILD COLLECTION' : 'THE SANCTUARY COLLECTION'}</p>
          <h1>Token Shop</h1>
          <p>Unlock first-party profile cosmetics with tokens. Items are account-bound and cannot be traded or cashed out.</p>
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

      {isGuest && <p className={styles.status}>Guest mode can explore the catalogue, but personal balances and owned items require a signed-in account.</p>}
      {!isGuest && !hasSupabaseAccount && <p className={styles.status}>Sign in with your account to view your balance and inventory.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.status} role="status">{notice}</p>}
      <section className={styles.inventory} aria-labelledby="inventory-heading">
        <div className={styles.catalogueHeading}>
          <div><p className={styles.eyebrow}>YOUR ACCOUNT</p><h2 id="inventory-heading">Your collection <span className={styles.inventoryCount}>{ownedItems.size}</span></h2><p>Permanent cosmetics unlocked on this account.</p></div>
        </div>
        {ownedItems.size === 0 ? (
          <div className={styles.inventoryEmpty}><ShoppingBag size={22} aria-hidden="true" /><span>Your collection is empty for now. Unlocked items will appear here.</span></div>
        ) : (
          <div className={styles.inventoryGrid}>
            {items.filter((item) => ownedItems.has(item.item_id)).map((item) => {
              const slot = item.kind;
              const equipped = equippedSlots[slot] === item.item_id;
              return <article className={styles.inventoryItem} key={item.item_id}>
                <div className={styles.inventoryArt} data-effect={item.effect_key ?? ""} aria-hidden="true">{item.asset_url?.startsWith('/') && !item.asset_url.startsWith('//') ? <img src={item.asset_url} alt="" /> : item.asset_text ?? <Sparkles size={22} />}</div>
                <div className={styles.inventoryCopy}><strong>{item.name}</strong><span>{item.kind.replaceAll('_', ' ')}</span></div>
                {equipped ? <span className={styles.equippedBadge}>Equipped</span> : <span className={styles.ownedBadge}><Check size={12} /> Owned</span>}
                {item.kind === 'accent_customization' ? (
                  <p className={styles.accentAvailable}>Picker available in your profile editor</p>
                ) : (
                  <button
                    type="button"
                    className={styles.equipButton}
                    disabled={!EQUIPPING_ENABLED || !hasSupabaseAccount || equippingItemId !== null || purchasingItemId !== null}
                    onClick={() => void (equipped ? unequipItem(item) : equipItem(item))}
                    title={!EQUIPPING_ENABLED ? 'Enable cosmetic equipment after staging verification.' : 'Change this cosmetic on your profile.'}
                  >
                    {equippingItemId === item.item_id ? (equipped ? 'Removing…' : 'Equipping…') : equipped ? 'Unequip' : 'Equip'}
                  </button>
                )}
              </article>;
            })}
          </div>
        )}
        <p className={styles.inventoryFootnote}>Equipment is account-bound. Changes remain locked until the reviewed staging migration is applied and the authenticated equip tests pass.</p>
      </section>

      <section className={styles.catalogue} aria-label="Cosmetic catalogue">
        <div className={styles.catalogueHeading}>
          <div><p className={styles.eyebrow}>THE COLLECTION</p><h2>Find your look</h2><p>{items.filter((item) => item.enabled).length} {items.filter((item) => item.enabled).length === 1 ? 'item' : 'items'} in the catalogue</p></div>
          <label className={styles.searchBox}><Search size={17} aria-hidden="true" /><span className={styles.visuallyHidden}>Search cosmetics</span><input value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Search the collection…" /></label>
        </div>
        {!isLoading && items.some((item) => item.enabled) && <div className={styles.filters}>
          <div className={styles.categoryFilters} aria-label="Filter by category">
            <button type="button" className={activeCategory === 'all' ? styles.activeFilter : styles.filterButton} aria-pressed={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>All items</button>
            {categories.map((category) => <button key={category} type="button" className={activeCategory === category ? styles.activeFilter : styles.filterButton} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>{category.replaceAll('_', ' ')}</button>)}
          </div>
          <label className={styles.ownedFilter}><input type="checkbox" checked={ownedOnly} onChange={(event) => setOwnedOnly(event.currentTarget.checked)} /><span>Show owned only</span></label>
        </div>}
        {isLoading ? <p className={styles.status} role="status">Loading shop items…</p> : !items.some((item) => item.enabled) ? (
          <div className={styles.emptyState}><ShoppingBag size={28} aria-hidden="true" /><h3>Collection is being prepared</h3><p>No shop items are currently enabled in the catalogue. New cosmetics will appear here when the server catalogue is ready.</p></div>
        ) : visibleItems.length === 0 ? (
          <div className={styles.emptyState}><Search size={26} aria-hidden="true" /><h3>No matching cosmetics</h3><p>Try another search or clear your filters to see the full collection.</p><button type="button" className={styles.resetButton} onClick={() => { setSearch(''); setActiveCategory('all'); setOwnedOnly(false); }}>Clear filters</button></div>
        ) : <>
          <p className={styles.resultCount} aria-live="polite">Showing {visibleItems.length} of {items.filter((item) => item.enabled).length} items</p>
          <div className={styles.grid}>{visibleItems.map((item) => {
            const owned = ownedItems.has(item.item_id);
            const purchasing = purchasingItemId === item.item_id;
            const shortfall = balance === null ? 0 : Math.max(0, item.price_tokens - balance);
            return <article className={styles.card} key={item.item_id}>
              <div className={styles.art} data-effect={item.effect_key ?? ""} aria-hidden="true">{item.asset_url?.startsWith('/') ? <img src={item.asset_url} alt="" /> : item.asset_text ? <span>{item.asset_text}</span> : <Sparkles size={38} strokeWidth={1.2} />}<span className={styles.artKind}>{item.kind.replaceAll('_', ' ')}</span></div>
              <div className={styles.cardBody}>
                <div className={styles.itemTitleRow}><div><p className={styles.kind}>{item.kind.replaceAll('_', ' ')}</p><h3>{item.name}</h3></div>{owned && <span className={styles.ownedBadge}><Check size={13} /> Owned</span>}</div>
                <p className={styles.description}>{item.description}</p>
                <div className={styles.cardFooter}><strong>{item.price_tokens.toLocaleString('en-GB')} <span>tokens</span></strong><button type="button" disabled={!SPENDING_ENABLED || !hasSupabaseAccount || owned || purchasingItemId !== null || equippingItemId !== null} onClick={() => void purchaseItem(item)} className={styles.buyButton}>{owned ? 'In collection' : !SPENDING_ENABLED ? 'Coming soon' : purchasing ? 'Unlocking…' : 'Unlock item'}</button></div>
                {!owned && balance !== null && shortfall > 0 && <p className={styles.shortfall}>You need {shortfall.toLocaleString('en-GB')} more tokens</p>}
                {owned && <p className={styles.ownedNote}>This cosmetic is permanently linked to your account.</p>}
              </div>
            </article>;
          })}</div>
        </>}
      </section>

      <p className={styles.footerNote}><ShoppingBag size={15} aria-hidden="true" /> Prices and eligibility come from the server-owned catalogue. Your balance changes only after the database confirms a successful redemption.</p>
    </main>
  );
}
