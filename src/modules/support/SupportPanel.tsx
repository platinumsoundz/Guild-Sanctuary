'use client';

import { useEffect, useState } from 'react';
import styles from './SupportPanel.module.css';

const tipOptions = [
  { id: 'tip_5_usd', amount: '$5' },
  { id: 'tip_10_usd', amount: '$10' },
  { id: 'tip_25_usd', amount: '$25' },
] as const;

type TipOption = (typeof tipOptions)[number]['id'];

interface SupportOptions {
  stripeTipsEnabled: boolean;
  lemonSqueezyCheckoutUrl: string | null;
  monzoContributionUrl: string | null;
}

function isSupportOptions(value: unknown): value is SupportOptions {
  if (typeof value !== 'object' || value === null) return false;
  if (!('stripeTipsEnabled' in value) || typeof value.stripeTipsEnabled !== 'boolean') return false;
  if (!('lemonSqueezyCheckoutUrl' in value) || !('monzoContributionUrl' in value)) return false;

  return [value.lemonSqueezyCheckoutUrl, value.monzoContributionUrl]
    .every((link) => link === null || typeof link === 'string');
}

export function SupportPanel() {
  const [options, setOptions] = useState<SupportOptions>({
    stripeTipsEnabled: false,
    lemonSqueezyCheckoutUrl: null,
    monzoContributionUrl: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<TipOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get('tip');
    if (result === 'success' || result === 'cancelled') {
      setNotice(result === 'success' ? 'Thank you for supporting the community.' : 'No contribution was made.');
      url.searchParams.delete('tip');
      window.history.replaceState(window.history.state, '', url);
    }

    let isActive = true;
    fetch('/api/community-tips', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Community support is temporarily unavailable.');
        const result: unknown = await response.json();
        if (!isSupportOptions(result)) {
          throw new Error('The support service returned an invalid response.');
        }
        if (isActive) setOptions(result);
      })
      .catch((loadError: unknown) => {
        if (isActive) setError(loadError instanceof Error ? loadError.message : 'Community support is temporarily unavailable.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const startTip = async (option: TipOption) => {
    setIsSubmitting(option);
    setError(null);
    try {
      const response = await fetch('/api/community-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option }),
      });
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== 'object' || result === null || !('url' in result) || typeof result.url !== 'string') {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error
          : 'Checkout could not be started.';
        throw new Error(message);
      }
      window.location.assign(result.url);
    } catch (checkoutError: unknown) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be started.');
      setIsSubmitting(null);
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="support-title">
      <p className={styles.eyebrow}>COMMUNITY-SUPPORTED</p>
      <h1 id="support-title">Help keep this space open</h1>
      <p className={styles.intro}>
        If Guild &amp; Sanctuary has been meaningful to you, you can make a voluntary, one-time contribution.
        Every core feature stays available without paying.
      </p>

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {isLoading ? (
        <p className={styles.status} role="status">Checking contribution options…</p>
      ) : (
        <div className={styles.providers}>
          {options.lemonSqueezyCheckoutUrl && (
            <section className={styles.provider}>
              <h2>Digital goods</h2>
              <a
                className={styles.providerLink}
                href={options.lemonSqueezyCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit our secure Lemon Squeezy checkout
              </a>
              <p className={styles.providerNote}>
                Digital purchases are not yet linked to in-app account entitlements.
              </p>
            </section>
          )}

          {options.stripeTipsEnabled && (
            <section className={styles.provider}>
              <h2>One-time community contribution</h2>
              <div className={styles.options} aria-label="One-time contribution amount">
                {tipOptions.map((option) => (
                  <button
                    className={styles.tipButton}
                    key={option.id}
                    type="button"
                    disabled={isSubmitting !== null}
                    onClick={() => void startTip(option.id)}
                  >
                    {isSubmitting === option.id ? 'Opening secure checkout…' : `Contribute ${option.amount} with Stripe`}
                  </button>
                ))}
              </div>
            </section>
          )}

          {options.monzoContributionUrl && (
            <section className={styles.provider}>
              <h2>Bank transfer</h2>
              <a
                className={styles.providerLink}
                href={options.monzoContributionUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Make a voluntary contribution with Monzo
              </a>
            </section>
          )}

          {!options.lemonSqueezyCheckoutUrl && !options.stripeTipsEnabled && !options.monzoContributionUrl && (
            <p className={styles.status}>Payment and contribution options are not currently configured.</p>
          )}
        </div>
      )}

      <p className={styles.privacy}>
        Contributions are optional and do not affect community visibility. External payment providers process
        transactions under their own terms. Voluntary contributions are not linked to your account; digital
        purchases do not grant in-app entitlements until that service is implemented. We do not use behavioral
        advertising.
      </p>
    </section>
  );
}
