export type VipTier = 'free' | 'wayfinder' | 'champion';
export type CosmeticKind = 'frame' | 'vip_badge' | 'sticker';

export interface Wallet {
  id: string;
  userId: string;
  balanceCredits: number;
  vipTier: VipTier;
  updatedAt: string;
}

export interface WalletLedgerEntry {
  id: string;
  walletId: string;
  amountCredits: number;
  reason: 'top_up' | 'purchase' | 'refund' | 'adjustment';
  referenceId: string;
  createdAt: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: 'USD';
}

export interface CosmeticProduct {
  id: string;
  name: string;
  kind: CosmeticKind;
  priceCredits: number;
  requiredVipTier: Exclude<VipTier, 'free'> | null;
  preview: string;
}

export interface InventoryItem {
  id: string;
  userId: string;
  productId: string;
  acquiredAt: string;
  equipped: boolean;
}

export interface MockCheckoutSession {
  id: string;
  userId: string;
  packageId: string;
  status: 'pending' | 'completed';
  provider: 'stripe-mock';
}

export interface WalletSnapshot {
  wallet: Wallet;
  inventory: InventoryItem[];
  ledger: WalletLedgerEntry[];
}

const creditPackages: CreditPackage[] = [
  { id: 'credits-500', name: '500 credits', credits: 500, priceCents: 499, currency: 'USD' },
  { id: 'credits-1500', name: '1,500 credits', credits: 1500, priceCents: 1299, currency: 'USD' },
];

const cosmeticCatalog: CosmeticProduct[] = [
  { id: 'frame-fern', name: 'Fern Frame', kind: 'frame', priceCredits: 250, requiredVipTier: null, preview: 'F' },
  { id: 'frame-arcade', name: 'Arcade Frame', kind: 'frame', priceCredits: 350, requiredVipTier: null, preview: 'A' },
  { id: 'badge-wayfinder', name: 'Wayfinder Badge', kind: 'vip_badge', priceCredits: 500, requiredVipTier: 'wayfinder', preview: 'W' },
  { id: 'sticker-spark', name: 'Spark Sticker', kind: 'sticker', priceCredits: 75, requiredVipTier: null, preview: '*' },
  { id: 'sticker-moon', name: 'Moon Sticker', kind: 'sticker', priceCredits: 75, requiredVipTier: null, preview: 'M' },
];

const vipPrices: Record<Exclude<VipTier, 'free'>, number> = { wayfinder: 1200, champion: 3000 };
const vipRank: Record<VipTier, number> = { free: 0, wayfinder: 1, champion: 2 };
const economyStorageKey = 'guild-sanctuary:economy:v1';
const wallets = new Map<string, Wallet>();
const inventories = new Map<string, InventoryItem[]>();
const ledgerEntries = new Map<string, WalletLedgerEntry[]>();
const checkoutSessions = new Map<string, MockCheckoutSession>();
let nextEconomyId = 1;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 60));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function restoreUserWallet(userId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(economyStorageKey) ?? '{}');
    if (!isRecord(parsed) || !isRecord(parsed[userId])) {
      return false;
    }

    const account = parsed[userId];
    const wallet = account.wallet;
    const inventory = account.inventory;
    const ledger = account.ledger;
    if (
      !isRecord(wallet) ||
      wallet.userId !== userId ||
      typeof wallet.id !== 'string' ||
      typeof wallet.balanceCredits !== 'number' ||
      !Number.isFinite(wallet.balanceCredits) ||
      (wallet.vipTier !== 'free' && wallet.vipTier !== 'wayfinder' && wallet.vipTier !== 'champion') ||
      !Array.isArray(inventory) ||
      !Array.isArray(ledger)
    ) {
      return false;
    }

    wallets.set(userId, wallet as unknown as Wallet);
    inventories.set(userId, inventory.filter((item): item is InventoryItem => (
      isRecord(item) && typeof item.id === 'string' && item.userId === userId &&
      typeof item.productId === 'string' && typeof item.acquiredAt === 'string' && typeof item.equipped === 'boolean'
    )));
    ledgerEntries.set(userId, ledger.filter((item): item is WalletLedgerEntry => (
      isRecord(item) && typeof item.id === 'string' && typeof item.walletId === 'string' &&
      typeof item.amountCredits === 'number' && typeof item.referenceId === 'string' && typeof item.createdAt === 'string' &&
      (item.reason === 'top_up' || item.reason === 'purchase' || item.reason === 'refund' || item.reason === 'adjustment')
    )));
    return true;
  } catch {
    return false;
  }
}

function persistUserWallet(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(economyStorageKey) ?? '{}');
    const allAccounts = isRecord(parsed) ? parsed : {};
    allAccounts[userId] = {
      wallet: wallets.get(userId),
      inventory: inventories.get(userId) ?? [],
      ledger: ledgerEntries.get(userId) ?? [],
    };
    window.localStorage.setItem(economyStorageKey, JSON.stringify(allAccounts));
  } catch {
    throw new Error('The demo wallet could not be saved in this browser.');
  }
}

function requireWallet(userId: string): Wallet {
  if (!userId) {
    throw new Error('Sign in to access your wallet.');
  }

  let wallet = wallets.get(userId);
  if (!wallet) {
    if (restoreUserWallet(userId)) {
      return wallets.get(userId)!;
    }
    wallet = {
      id: `wallet-${nextEconomyId++}`,
      userId,
      balanceCredits: 1000,
      vipTier: 'free',
      updatedAt: new Date().toISOString(),
    };
    wallets.set(userId, wallet);
    inventories.set(userId, []);
    ledgerEntries.set(userId, []);
  }
  return wallet;
}

function recordLedger(wallet: Wallet, amountCredits: number, reason: WalletLedgerEntry['reason'], referenceId: string): void {
  const entry: WalletLedgerEntry = {
    id: `ledger-${nextEconomyId++}`,
    walletId: wallet.id,
    amountCredits,
    reason,
    referenceId,
    createdAt: new Date().toISOString(),
  };
  ledgerEntries.get(wallet.userId)?.unshift(entry);
  wallet.updatedAt = entry.createdAt;
}

export async function fetchWallet(userId: string): Promise<WalletSnapshot> {
  await delay();
  const wallet = requireWallet(userId);
  return {
    wallet: { ...wallet },
    inventory: (inventories.get(userId) ?? []).map((item) => ({ ...item })),
    ledger: (ledgerEntries.get(userId) ?? []).map((entry) => ({ ...entry })),
  };
}

export async function fetchCreditPackages(): Promise<CreditPackage[]> {
  await delay();
  return creditPackages.map((item) => ({ ...item }));
}

export async function fetchCosmeticCatalog(): Promise<CosmeticProduct[]> {
  await delay();
  return cosmeticCatalog.map((item) => ({ ...item }));
}

export async function createStripeCheckoutMock(userId: string, packageId: string): Promise<MockCheckoutSession> {
  requireWallet(userId);
  if (!creditPackages.some((item) => item.id === packageId)) {
    throw new Error('That credit package is unavailable.');
  }

  await delay();
  const session: MockCheckoutSession = {
    id: `checkout-${nextEconomyId++}`,
    userId,
    packageId,
    status: 'pending',
    provider: 'stripe-mock',
  };
  checkoutSessions.set(session.id, session);
  return { ...session };
}

export async function completeStripeCheckoutMock(userId: string, checkoutId: string): Promise<WalletSnapshot> {
  const session = checkoutSessions.get(checkoutId);
  if (!session || session.userId !== userId) {
    throw new Error('The checkout session is invalid.');
  }
  if (session.status === 'completed') {
    return fetchWallet(userId);
  }

  const wallet = requireWallet(userId);
  const creditPackage = creditPackages.find((item) => item.id === session.packageId);
  if (!creditPackage) {
    throw new Error('The credit package is unavailable.');
  }

  await delay();
  wallet.balanceCredits += creditPackage.credits;
  recordLedger(wallet, creditPackage.credits, 'top_up', checkoutId);
  session.status = 'completed';
  persistUserWallet(userId);
  return fetchWallet(userId);
}

export async function purchaseCosmetic(userId: string, productId: string): Promise<WalletSnapshot> {
  const wallet = requireWallet(userId);
  const product = cosmeticCatalog.find((item) => item.id === productId);
  if (!product) {
    throw new Error('That cosmetic is unavailable.');
  }
  if (product.requiredVipTier && vipRank[wallet.vipTier] < vipRank[product.requiredVipTier]) {
    throw new Error('This cosmetic requires an active VIP tier.');
  }

  await delay();
  if (wallet.balanceCredits < product.priceCredits) {
    throw new Error('There are not enough credits in this wallet.');
  }

  const inventory = inventories.get(userId) ?? [];
  if (inventory.some((item) => item.productId === productId)) {
    throw new Error('This cosmetic is already in your inventory.');
  }

  wallet.balanceCredits -= product.priceCredits;
  const item: InventoryItem = {
    id: `inventory-${nextEconomyId++}`,
    userId,
    productId,
    acquiredAt: new Date().toISOString(),
    equipped: false,
  };
  inventory.push(item);
  inventories.set(userId, inventory);
  recordLedger(wallet, -product.priceCredits, 'purchase', item.id);
  persistUserWallet(userId);
  return fetchWallet(userId);
}

export async function purchaseVipTier(userId: string, tier: Exclude<VipTier, 'free'>): Promise<WalletSnapshot> {
  const wallet = requireWallet(userId);
  const price = vipPrices[tier];
  if (vipRank[tier] <= vipRank[wallet.vipTier]) {
    throw new Error('Choose a higher membership tier to upgrade.');
  }
  await delay();
  if (wallet.balanceCredits < price) {
    throw new Error('There are not enough credits in this wallet.');
  }

  wallet.balanceCredits -= price;
  wallet.vipTier = tier;
  recordLedger(wallet, -price, 'purchase', `vip-${tier}`);
  persistUserWallet(userId);
  return fetchWallet(userId);
}

export async function equipInventoryItem(userId: string, inventoryItemId: string): Promise<WalletSnapshot> {
  const wallet = requireWallet(userId);
  const inventory = inventories.get(userId) ?? [];
  const item = inventory.find((entry) => entry.id === inventoryItemId);
  if (!item) {
    throw new Error('That inventory item is unavailable.');
  }

  await delay();
  const product = cosmeticCatalog.find((entry) => entry.id === item.productId);
  const shouldEquip = !item.equipped;
  if (product?.kind === 'frame' && shouldEquip) {
    for (const otherItem of inventory) {
      if (cosmeticCatalog.find((entry) => entry.id === otherItem.productId)?.kind === 'frame') {
        otherItem.equipped = false;
      }
    }
  }
  item.equipped = shouldEquip;
  wallet.updatedAt = new Date().toISOString();
  persistUserWallet(userId);
  return fetchWallet(userId);
}

export async function getVipTierPrice(tier: Exclude<VipTier, 'free'>): Promise<number> {
  await delay();
  return vipPrices[tier];
}