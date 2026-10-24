import { getSupabaseBrowserClient } from '@/services/supabase';

export type TokenBundleId = 'tokens_100' | 'tokens_600' | 'tokens_1200';
export type TokenLedgerKind = TokenBundleId | 'signup_bonus';
export type TokenSpendItemKind =
  | 'profile_frame'
  | 'profile_effect'
  | 'profile_badge'
  | 'profile_banner'
  | 'chat_item'
  | 'gift'
  | 'vip'
  | 'promotion';

export interface TokenBundle {
  id: TokenBundleId;
  tokens: number;
  amountMinor: number;
  currency: 'GBP';
}

export interface TokenLedgerEntry {
  id: string;
  bundleId: TokenLedgerKind;
  tokensDelta: number;
  amountMinor: number;
  createdAt: string;
}

export interface TokenSpendItem {
  itemId: string;
  name: string;
  description: string;
  priceTokens: number;
  kind: TokenSpendItemKind;
  enabled: boolean;
  assetUrl: string | null;
  assetText: string | null;
  effectKey: string | null;
  sortOrder: number;
}

export interface TokenEntitlement {
  itemId: string;
  grantedAt: string;
}

export interface TokenSpendEntry {
  id: string;
  itemId: string;
  itemName: string;
  tokensDelta: number;
  createdAt: string;
}

export interface TokenSpendResult {
  balanceTokens: number;
  itemId: string;
  alreadyApplied: boolean;
}

export interface WalletSnapshot {
  userId: string;
  balanceTokens: number;
  ledger: TokenLedgerEntry[];
  spends: TokenSpendEntry[];
  catalog: TokenSpendItem[];
  entitlements: TokenEntitlement[];
}

export const tokenBundles: TokenBundle[] = [
  { id: 'tokens_100', tokens: 100, amountMinor: 100, currency: 'GBP' },
  { id: 'tokens_600', tokens: 600, amountMinor: 500, currency: 'GBP' },
  { id: 'tokens_1200', tokens: 1200, amountMinor: 1000, currency: 'GBP' },
];

export function isSupabaseWalletConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function requireSignedInUser(expectedUserId: string): Promise<void> {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Sign in with your Sanctuary account to access the token wallet.');
  if (data.user.id !== expectedUserId) throw new Error('Your token wallet must match the signed-in account.');
}

export async function fetchWallet(userId: string): Promise<WalletSnapshot> {
  await requireSignedInUser(userId);
  const client = getSupabaseBrowserClient();
  const [walletResult, ledgerResult, catalogResult, entitlementResult, spendResult] = await Promise.all([
    client.from('token_wallets').select('balance_tokens').eq('user_id', userId).maybeSingle(),
    client.from('token_ledger')
      .select('id,bundle_id,tokens_delta,amount_total,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    client.from('token_spend_catalog')
      .select('item_id,name,description,price_tokens,kind,enabled,asset_url,asset_text,effect_key,sort_order')
      .eq('enabled', true)
      .order('sort_order', { ascending: true })
      .order('price_tokens', { ascending: true }),
    client.from('token_entitlements')
      .select('item_id,granted_at')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false }),
    client.from('token_spend_ledger')
      .select('id,item_id,item_name,tokens_delta,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (walletResult.error) throw new Error(`Token balance could not be loaded: ${walletResult.error.message}`);
  if (ledgerResult.error) throw new Error(`Token history could not be loaded: ${ledgerResult.error.message}`);
  if (catalogResult.error) throw new Error(`Token spending could not be loaded: ${catalogResult.error.message}`);
  if (entitlementResult.error) throw new Error(`Token unlocks could not be loaded: ${entitlementResult.error.message}`);
  if (spendResult.error) throw new Error(`Token spending history could not be loaded: ${spendResult.error.message}`);

  return {
    userId,
    balanceTokens: walletResult.data?.balance_tokens ?? 0,
    ledger: (ledgerResult.data ?? []).map((entry) => ({
      id: entry.id,
      bundleId: entry.bundle_id,
      tokensDelta: entry.tokens_delta,
      amountMinor: entry.amount_total,
      createdAt: entry.created_at,
    })),
    spends: (spendResult.data ?? []).map((entry) => ({
      id: entry.id,
      itemId: entry.item_id,
      itemName: entry.item_name,
      tokensDelta: entry.tokens_delta,
      createdAt: entry.created_at,
    })),
    catalog: (catalogResult.data ?? []).map((item) => ({
      itemId: item.item_id,
      name: item.name,
      description: item.description,
      priceTokens: item.price_tokens,
      kind: item.kind,
      enabled: item.enabled,
      assetUrl: item.asset_url ?? null,
      assetText: item.asset_text ?? null,
      effectKey: item.effect_key ?? null,
      sortOrder: item.sort_order,
    })),
    entitlements: (entitlementResult.data ?? []).map((entry) => ({
      itemId: entry.item_id,
      grantedAt: entry.granted_at,
    })),
  };
}

export async function spendTokens(
  userId: string,
  itemId: string,
  idempotencyKey: string,
): Promise<TokenSpendResult> {
  await requireSignedInUser(userId);
  const { data, error } = await getSupabaseBrowserClient().rpc('spend_tokens', {
    requested_item_id: itemId,
    requested_idempotency_key: idempotencyKey,
  });
  if (error) throw new Error(error.message || 'The tokens could not be spent.');
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result.balance_tokens !== 'number') {
    throw new Error('The token spend did not return a wallet balance.');
  }
  return {
    balanceTokens: result.balance_tokens,
    itemId: result.item_id,
    alreadyApplied: Boolean(result.already_applied),
  };
}

export async function equipProfileCosmetic(userId: string, itemId: string): Promise<void> {
  await requireSignedInUser(userId);
  const { error } = await getSupabaseBrowserClient().rpc('equip_profile_cosmetic', {
    requested_item_id: itemId,
  });
  if (error) throw new Error(error.message || 'The cosmetic could not be equipped.');
}

export async function checkTokenCheckoutEnabled(userId: string): Promise<boolean> {
  await requireSignedInUser(userId);
  const { data, error } = await getSupabaseBrowserClient().functions.invoke('token-checkout', {
    body: { action: 'status' },
  });
  return !error && typeof data === 'object' && data !== null && 'enabled' in data && data.enabled === true;
}

export async function startTokenCheckout(userId: string, bundleId: TokenBundleId): Promise<string> {
  await requireSignedInUser(userId);
  const { data, error } = await getSupabaseBrowserClient().functions.invoke('token-checkout', {
    body: { bundleId },
  });
  if (error) throw new Error(error.message || 'Token checkout is not ready yet.');
  if (typeof data !== 'object' || data === null || !('url' in data) || typeof data.url !== 'string') {
    throw new Error('Secure token checkout is not available yet.');
  }

  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(data.url);
  } catch {
    throw new Error('Stripe returned an invalid checkout URL.');
  }
  if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com') {
    throw new Error('Checkout did not return a verified Stripe URL.');
  }
  return checkoutUrl.toString();
}
