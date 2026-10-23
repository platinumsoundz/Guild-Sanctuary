'use client';

import { useEffect, useState } from 'react';
import { isSupabaseWalletConfigured } from './service';
import { useWallet } from './useWallet';
import styles from './WalletPanel.module.css';

interface WalletPanelProps {
  userId: string;
  isGuest: boolean;
}

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function WalletPanel({ userId, isGuest }: WalletPanelProps) {
  const {
    snapshot,
    bundles,
    checkoutEnabled,
    isLoading,
    isStartingCheckout,
    error,
    refresh,
    buyBundle,
  } = useWallet(userId, isGuest);
  const [notice, setNotice] = useState<string | null>(null);
  const hasSupabaseAccount = !isGuest && isSupabaseWalletConfigured();

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

  return (
    <main className={styles.wallet}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>THE SANCTUARY WALLET</p>
          <h1>Tokens</h1>
          <p className={styles.intro}>Your balance and available token bundles.</p>
        </div>
        <div className={styles.balanceCard} aria-live="polite">
          <span>Available balance</span>
          <strong>{isLoading ? '…' : hasSupabaseAccount ? `${(snapshot?.balanceTokens ?? 0).toLocaleString('en-GB')} tokens` : 'Sign in'}</strong>
        </div>
      </header>

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {isGuest && <p className={styles.notice}>Guest Mode is read-only. Sign in with your account to view a wallet or buy tokens.</p>}
      {!isGuest && !hasSupabaseAccount && (
        <p className={styles.notice}>A persistent token wallet is available to Supabase accounts. This demo/local account cannot make purchases.</p>
      )}

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
        <p className={styles.disclaimer}>Tokens are account-bound in this first release: no transfers, trading, or cash-out. Deleting your account also deletes its wallet and token history.</p>
      </section>

      <section className={styles.section} aria-labelledby="future-uses-title">
        <p className={styles.eyebrow}>PLANNED USES</p>
        <h2 id="future-uses-title">What tokens can unlock later</h2>
        <p className={styles.intro}>Profile banners and photo outlines, chat bubbles and emotes, gifts, VIP status, and post promotion are planned. These features are not purchasable with tokens yet.</p>
        <p className={styles.disclaimer}>Gifts and token trading are not enabled. Tokens have no cash value and cannot be redeemed for money.</p>
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
        ) : snapshot?.ledger.length ? (
          <ul className={styles.historyList}>
            {snapshot.ledger.map((entry) => (
              <li className={styles.historyRow} key={entry.id}>
                <span>Bundle purchase · {entry.tokensDelta.toLocaleString('en-GB')} tokens</span>
                <span>+{entry.tokensDelta.toLocaleString('en-GB')} tokens</span>
                <span>{gbp.format(entry.amountMinor / 100)}</span>
                <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString('en-GB')}</time>
              </li>
            ))}
          </ul>
        ) : isLoading ? (
          <p className={styles.disclaimer}>Loading transaction history…</p>
        ) : (
          <p className={styles.disclaimer}>Token purchases will appear here after Stripe confirms payment.</p>
        )}
      </section>
    </main>
  );
}
