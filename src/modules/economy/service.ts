import { getSupabaseBrowserClient } from '@/services/supabase';

export type TokenBundleId = 'tokens_100' | 'tokens_600' | 'tokens_1200';
export interface TokenBundle { id: TokenBundleId; tokens: number; amountMinor: number; currency: 'GBP'; }
export interface TokenLedgerEntry { id: string; kind: 'purchase' | 'bonus' | 'spend'; description: string; tokensDelta: number; amountMinor: number | null; createdAt: string; }
export interface WalletSnapshot { userId: string; balanceTokens: number; ledger: TokenLedgerEntry[]; }

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
  const [walletResult, purchaseResult, spendResult, bonusResult] = await Promise.all([
    client.from('token_wallets').select('balance_tokens').eq('user_id', userId).maybeSingle(),
    client.from('token_ledger').select('id,bundle_id,tokens_delta,amount_total,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    client.from('token_spend_ledger').select('id,item_name,tokens_delta,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    client.from('token_bonus_ledger').select('id,tokens_delta,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
  ]);
  if (walletResult.error) throw new Error(`Token balance could not be loaded: ${walletResult.error.message}`);
  if (purchaseResult.error) throw new Error(`Token purchase history could not be loaded: ${purchaseResult.error.message}`);
  if (spendResult.error) throw new Error(`Token spending history could not be loaded: ${spendResult.error.message}`);
  if (bonusResult.error) throw new Error(`Token bonus history could not be loaded: ${bonusResult.error.message}`);
  const ledger: TokenLedgerEntry[] = [
    ...(purchaseResult.data ?? []).map((entry) => ({
      id: entry.id, kind: 'purchase' as const, description: `Token bundle: ${entry.bundle_id.replaceAll('_', ' ')}`,
      tokensDelta: entry.tokens_delta, amountMinor: entry.amount_total, createdAt: entry.created_at,
    })),
    ...(spendResult.data ?? []).map((entry) => ({
      id: entry.id, kind: 'spend' as const, description: `Cosmetic unlock: ${entry.item_name}`,
      tokensDelta: entry.tokens_delta, amountMinor: null, createdAt: entry.created_at,
    })),
    ...(bonusResult.data ?? []).map((entry) => ({
      id: entry.id, kind: 'bonus' as const, description: 'Verified beta welcome bonus',
      tokensDelta: entry.tokens_delta, amountMinor: null, createdAt: entry.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 40);
  return { userId, balanceTokens: walletResult.data?.balance_tokens ?? 0, ledger };
}

export async function checkTokenCheckoutEnabled(userId: string): Promise<boolean> {
  await requireSignedInUser(userId);
  // UI hint only; the server independently enforces its opt-in and test-key checks.
  return process.env.NEXT_PUBLIC_SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED === 'true';
}

export async function startTokenCheckout(userId: string, bundleId: TokenBundleId): Promise<string> {
  await requireSignedInUser(userId);
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ bundleId }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
      ? data.error : 'Secure token checkout is not available yet.';
    throw new Error(message);
  }
  if (typeof data !== 'object' || data === null || !('url' in data) || typeof data.url !== 'string') {
    throw new Error('Secure token checkout did not return a checkout URL.');
  }
  let checkoutUrl: URL;
  try { checkoutUrl = new URL(data.url); }
  catch { throw new Error('Stripe returned an invalid checkout URL.'); }
  if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com') {
    throw new Error('Checkout did not return a verified Stripe URL.');
  }
  return checkoutUrl.toString();
}
