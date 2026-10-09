'use client';

import { useWallet } from './useWallet';
import styles from './WalletPanel.module.css';

interface WalletPanelProps {
  userId: string;
}

export function WalletPanel({ userId }: WalletPanelProps) {
  const {
    snapshot,
    packages,
    catalog,
    checkout,
    isLoading,
    error,
    beginTopUp,
    completeTopUp,
    unlock,
    upgradeVip,
    equip,
  } = useWallet(userId);

  const inventory = snapshot?.inventory ?? [];

  return (
    <section className={styles.wallet} aria-labelledby="wallet-title">
      <div className={styles.walletHeader}>
        <div>
          <p className={styles.eyebrow}>COMMUNITY ECONOMY</p>
          <h2 id="wallet-title">Wallet &amp; collection</h2>
        </div>
        <p className={styles.balance}>{isLoading ? 'Loading...' : `${snapshot?.wallet.balanceCredits ?? 0} credits`}</p>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.economySection}>
        <h3>Credit top-up</h3>
        <div className={styles.packageList}>
          {packages.map((creditPackage) => (
            <div className={styles.productRow} key={creditPackage.id}>
              <span>{creditPackage.name}</span>
              <span>${(creditPackage.priceCents / 100).toFixed(2)} {creditPackage.currency}</span>
              <button className={styles.actionButton} type="button" onClick={() => void beginTopUp(creditPackage.id)}>
                Create mock checkout
              </button>
            </div>
          ))}
        </div>
        {checkout && (
          <div className={styles.checkoutNotice} role="status">
            <span>Mock Stripe checkout {checkout.status}</span>
            <button className={styles.actionButton} type="button" onClick={() => void completeTopUp()}>
              Complete demo checkout
            </button>
          </div>
        )}
        <p className={styles.disclaimer}>Demo checkout only. No charge is created and no payment provider is contacted.</p>
      </div>

      <div className={styles.economySection}>
        <div className={styles.sectionTitle}>
          <h3>Membership</h3>
          <span>{snapshot?.wallet.vipTier ?? 'free'} tier</span>
        </div>
        <div className={styles.packageList}>
          <div className={styles.productRow}>
            <span>Wayfinder VIP</span>
            <span>1,200 credits</span>
            <button className={styles.actionButton} type="button" disabled={snapshot?.wallet.vipTier !== 'free'} onClick={() => void upgradeVip('wayfinder')}>Unlock tier</button>
          </div>
          <div className={styles.productRow}>
            <span>Champion VIP</span>
            <span>3,000 credits</span>
            <button className={styles.actionButton} type="button" disabled={snapshot?.wallet.vipTier === 'champion'} onClick={() => void upgradeVip('champion')}>Unlock tier</button>
          </div>
        </div>
        <p className={styles.disclaimer}>VIP tiers are permanent demo unlocks. Recurring billing is not configured.</p>
      </div>

      <div className={styles.economySection}>
        <h3>Cosmetics &amp; stickers</h3>
        <div className={styles.packageList}>
          {catalog.map((product) => {
            const owned = inventory.some((item) => item.productId === product.id);
            const canUse = !product.requiredVipTier || snapshot?.wallet.vipTier !== 'free';
            return (
              <div className={styles.productRow} key={product.id}>
                <span className={styles.cosmeticName}><span aria-hidden="true">{product.preview}</span>{product.name}</span>
                <span>{owned ? 'In collection' : `${product.priceCredits} credits`}</span>
                <button className={styles.actionButton} type="button" disabled={owned || !canUse} onClick={() => void unlock(product.id)}>
                  {owned ? 'Owned' : 'Unlock'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.economySection}>
        <h3>Your collection</h3>
        {inventory.length === 0 ? <p className={styles.disclaimer}>Unlocked frames, badges, and stickers will appear here.</p> : (
          <div className={styles.packageList}>
            {inventory.map((item) => {
              const product = catalog.find((catalogItem) => catalogItem.id === item.productId);
              return (
                <div className={styles.productRow} key={item.id}>
                  <span>{product?.name ?? 'Cosmetic'}</span>
                  <span>{item.equipped ? 'Equipped' : 'Owned'}</span>
                  <button className={styles.textButton} type="button" onClick={() => void equip(item.id)}>
                    {item.equipped ? 'Unequip' : 'Equip'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}