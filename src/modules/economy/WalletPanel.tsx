'use client';

import { useEffect, useState } from 'react';
import { isSupabaseWalletConfigured, type TokenSpendItem } from './service';
import { useWallet } from './useWallet';
import styles from './WalletPanel.module.css';

interface WalletPanelProps {
  userId: string;
  isGuest: boolean;
  onSpendComplete?: () => void | Promise<void>;
}

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function WalletPanel({ userId, isGuest, onSpendComplete }: WalletPanelProps) {
  const {
    snapshot,
    bundles,
    catalog,
    entitlements,
    checkoutEnabled,
    isLoading,
    isStartingCheckout,
    spendingItemId,
    error,
    refresh,
    buyBundle,
    spendItem,
  } = useWallet(userId, isGuest);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const hasSupabaseAccount = !isGuest && isSupabaseWalletConfigured();
  const entitledItemIds = new Set(entitlements.map((entry) => entry.itemId));

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get('wallet');
    if (result === 'success') {
      setNotice('Stripe returned you here. Your balance updates after the verified payment webhook is processed.');
      void refresh();
    } else if (result === 'cancelled') {
      setNotice('Checkout was cancelled. No tokens were added.');
    }
    if (result === 'success' || result === 'cancelled') {
      url.searchParams.delete('wallet');
      window.history.replaceState(window.history.state, '', url);
    }
  }, [refresh]);

  const handleSpend = async (item: TokenSpendItem) => {
    const result = await spendItem(item.itemId);
    if (!result) return;
    setConfirmingItemId(null);
    setNotice(result.alreadyApplied
      ? `${item.name} was already unlocked. Your balance was not charged again.`
      : `${item.name} unlocked. ${result.balanceTokens.toLocaleString('en-GB')} tokens remain.`);
    try {
      await onSpendComplete?.();
    } catch {
      // The spend succeeded; a profile refresh failure should not look like a charge failure.
    }
  };

  const activity = [
    ...(snapshot?.ledger ?? []).map((entry) => ({
      id: `purchase-${entry.id}`,
      label: entry.bundleId === 'signup_bonus' ? 'Welcome bonus' : 'Bundle purchase',
      tokensDelta: entry.tokensDelta,
      amountMinor: entry.bundleId === 'signup_bonus' ? null : entry.amountMinor,
      createdAt: entry.createdAt,
    })),
    ...(snapshot?.spends ?? []).map((entry) => ({
      id: `spend-${entry.id}`,
      label: entry.itemName,
      tokensDelta: entry.tokensDelta,
      amountMinor: null,
      createdAt: entry.createdAt,
    })),
  ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

  return (
    <main className={styles.wallet}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>THE SANCTUARY WALLET</p>
          <h1>Tokens</h1>
          <p className={styles.intro}>Your balance, available bundles, and profile unlocks.</p>
        </div>
        <div className={styles.balanceCard} aria-live="polite">
          <span>Available balance</span>
          <strong>{isLoading ? '…' : hasSupabaseAccount ? `${(snapshot?.balanceTokens ?? 0).toLocaleString('en-GB')} tokens` : 'Sign in'}</strong>
        </div>
      </header>

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {isGuest && <p className={styles.notice}>Guest Mode is read-only. Sign in with your account to view a wallet, buy tokens, or spend them.</p>}
      {!isGuest && !hasSupabaseAccount && (
        <p className={styles.notice}>A persistent token wallet is available to Supabase accounts. This demo/local account cannot buy or spend tokens.</p>
      )}

      <section className={styles.section} aria-labelledby="spend-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>SPEND TOKENS</p>
            <h2 id="spend-title">Profile cosmetics</h2>
          </div>
        </div>
        <p className={styles.intro}>Unlock permanent profile frames. The server owns the price and applies the unlock atomically.</p>
        {!hasSupabaseAccount ? (
          <p className={styles.disclaimer}>Sign in with a Supabase account to spend tokens.</p>
        ) : catalog.length === 0 ? (
          <p className={styles.disclaimer}>No token spend items are enabled yet. Apply the token-spending migration to load the catalog.</p>
        ) : (
          <div className={styles.spendGrid}>
            {catalog.map((item) => {
              const owned = entitledItemIds.has(item.itemId);
              const affordable = (snapshot?.balanceTokens ?? 0) >= item.priceTokens;
              const confirming = confirmingItemId === item.itemId;
              const spending = spendingItemId === item.itemId;
              return (
                <article className={styles.spendCard} key={item.itemId}>
                  <div className={styles.spendCardHeader}>
                    <h3>{item.name}</h3>
                    <span className={styles.spendPrice}>{item.priceTokens.toLocaleString('en-GB')} tokens</span>
                  </div>
                  <p>{item.description}</p>
                  {owned ? (
                    <span className={styles.ownedBadge}>Unlocked</span>
                  ) : confirming ? (
                    <div className={styles.confirmBox}>
                      <p>
                        Spend {item.priceTokens.toLocaleString('en-GB')} tokens? Your balance after will be{' '}
                        {Math.max(0, (snapshot?.balanceTokens ?? 0) - item.priceTokens).toLocaleString('en-GB')}.
                      </p>
                      <div className={styles.confirmActions}>
                        <button
                          className={styles.buyButton}
                          type="button"
                          disabled={spending || !affordable}
                          onClick={() => void handleSpend(item)}
                        >
                          {spending ? 'Spending…' : 'Confirm spend'}
                        </button>
                        <button
                          className={styles.refreshButton}
                          type="button"
                          disabled={spending}
                          onClick={() => setConfirmingItemId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className={styles.buyButton}
                      type="button"
                      disabled={!affordable || spending || isLoading}
                      onClick={() => setConfirmingItemId(item.itemId)}
                    >
                      {spending ? 'Spending…' : affordable ? 'Spend tokens' : 'Not enough tokens'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
        <p className={styles.disclaimer}>Only enabled server-side catalog items can be bought. Tokens are account-bound and have no cash value.</p>
      </section>

      <section className={styles.section} aria-labelledby="bundles-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>ONE-TIME TOP-UPS</p>
            <h2 id="bundles-title">Choose a bundle</h2>
          </div>
          {hasSupabaseAccount && (
            <button className={styles.refreshButton} type="button" onClick={() => void refresh()} disabled={isLoading}>
              Refresh balance
            </button>
          )}
        </div>
        <div className={styles.bundleGrid}>
          {bundles.map((bundle) => (
            <article className={styles.bundleCard} key={bundle.id}>
              <p className={styles.bundleTokens}>{bundle.tokens.toLocaleString('en-GB')}</p>
              <h3>Tokens</h3>
              <p className={styles.bundlePrice}>{gbp.format(bundle.amountMinor / 100)}</p>
              <button
                className={styles.buyButton}
                type="button"
                disabled={!hasSupabaseAccount || !checkoutEnabled || isLoading || isStartingCheckout}
                onClick={() => void buyBundle(bundle.id)}
              >
                {isStartingCheckout ? 'Opening Stripe…' : !hasSupabaseAccount ? 'Sign in to buy' : checkoutEnabled ? 'Buy with Stripe' : 'Purchases not enabled'}
              </button>
            </article>
          ))}
        </div>
        {hasSupabaseAccount && !isLoading && !checkoutEnabled && (
          <p className={styles.disclaimer}>Purchases stay disabled until Stripe prices, webhook verification, and token fulfillment are configured.</p>
        )}
        <p className={styles.disclaimer}>New accounts receive a 100-token welcome bonus. Deleting your account also deletes its wallet, unlocks, and token history.</p>
      </section>

      <section className={styles.section} aria-labelledby="future-uses-title">
        <p className={styles.eyebrow}>TOKEN USES</p>
        <h2 id="future-uses-title">What tokens unlock</h2>
        <p className={styles.intro}>Profile frames are available now. Chat items, gifts, VIP status, and post promotion remain planned and are not purchasable yet.</p>
        <p className={styles.disclaimer}>Gifts, transfers, and token trading are not enabled. Tokens have no cash value and cannot be redeemed for money.</p>
      </section>

      <section className={styles.section} aria-labelledby="history-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>ACCOUNT ACTIVITY</p>
            <h2 id="history-title">Token history</h2>
          </div>
        </div>
        {!hasSupabaseAccount ? (
          <p className={styles.disclaimer}>Sign in with a Supabase account to view transaction history.</p>
        ) : activity.length ? (
          <ul className={styles.historyList}>
            {activity.map((entry) => (
              <li className={styles.historyRow} key={entry.id}>
                <span>{entry.label}</span>
                <span>{entry.tokensDelta > 0 ? '+' : ''}{entry.tokensDelta.toLocaleString('en-GB')} tokens</span>
                <span>{entry.amountMinor === null ? '—' : gbp.format(entry.amountMinor / 100)}</span>
                <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString('en-GB')}</time>
              </li>
            ))}
          </ul>
        ) : isLoading ? (
          <p className={styles.disclaimer}>Loading transaction history…</p>
        ) : (
          <p className={styles.disclaimer}>Purchases and unlocks will appear here.</p>
        )}
      </section>
    </main>
  );
}
