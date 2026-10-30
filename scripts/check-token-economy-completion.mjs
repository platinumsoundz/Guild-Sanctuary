import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const migration = readFileSync('supabase/migrations/20261030140000_token_shop_bonus_inventory_review.sql', 'utf8');
const shop = readFileSync('src/modules/economy/TokenShopPanel.tsx', 'utf8');
const wallet = readFileSync('src/modules/economy/service.ts', 'utf8');
const walletPanel = readFileSync('src/modules/economy/WalletPanel.tsx', 'utf8');
const profileService = readFileSync('src/modules/profiles/service.ts', 'utf8');
const profileCard = readFileSync('src/modules/profiles/components/ProfileCard.tsx', 'utf8');
const profileDashboard = readFileSync('src/modules/profiles/components/ProfileDashboard.tsx', 'utf8');
const stripeWebhook = readFileSync('supabase/functions/stripe-token-webhook/index.ts', 'utf8');
const tokenCheckout = readFileSync('supabase/functions/token-checkout/index.ts', 'utf8');

const checks = [
  ['approved eight-item staging catalog is seeded', ['frame_moonlit_halo','frame_wildflower_wreath','border_aurora_line','border_gilded_laurel','theme_tidal_glass','theme_twilight_garden','palette_sanctuary_colour_pack','unlock_custom_accent_picker'].every((id) => migration.includes(id))],
  ['legacy demo catalogue is retired from sale without deleting entitlements', /update public\.token_spend_catalog set enabled=false/.test(migration) && /profile_frame_sanctuary/.test(migration)],
  ['beta program defaults closed and has a hard 100-grant cap', /beta_open boolean not null default false/.test(migration) && /awarded_count between 0 and 100/.test(migration)],
  ['bonus allocation is serialized and idempotent per account', migration.includes('for update;') && migration.includes('token_ledger_one_signup_bonus_per_user_idx') && migration.includes('next_position := program_row.awarded_count + 1')],
  ['bonus requires a verified account created after beta opening', /email_confirmed_at/.test(migration) && /account_created_at < program_row\.opened_at/.test(migration)],
  ['beta bonus reuses the canonical token ledger and retires the legacy trigger', /bundle_id='signup_bonus'/.test(migration) && /drop trigger if exists profiles_grant_signup_token_bonus/.test(migration) && /token_ledger_one_signup_bonus_per_user_idx/.test(migration) && /grant_position,verified_at/.test(migration)],
  ['support spending holds are audited and service-role-only', /token_spending_hold_audit/.test(migration) && /grant execute on function public\.place_token_spending_hold/.test(migration) && /auth\.role\(\) <> 'service_role'/.test(migration)],
  ['manual adjustments are service-role-only, idempotent and reject negative balances', /token_adjustment_ledger/.test(migration) && /apply_token_adjustment/.test(migration) && /wallet_balance \+ requested_tokens_delta < 0/.test(migration) && /source_key text not null unique/.test(migration)],
  ['spend RPC checks account holds', /Token spending is paused while your account is under review/.test(migration)],
  ['Stripe dispute webhook automatically pauses the linked wallet', stripeWebhook.includes('charge.dispute.created') && stripeWebhook.includes('place_token_spending_hold') && stripeWebhook.includes('stripe_payment_intent_id')],
  ['checkout records token metadata on the PaymentIntent', /payment_intent_data/.test(tokenCheckout) && /sanctuary_purchase: 'token_bundle'/.test(tokenCheckout) && /stripe_payment_intent_id text/.test(migration)],
  ['spend and equip remain revoked until staging approval', /revoke all on function public\.spend_tokens\(text,uuid\) from public,anon,authenticated,service_role/.test(migration) && /revoke all on function public\.equip_profile_cosmetic\(text\) from public,anon,authenticated,service_role/.test(migration)],
  ['profile cosmetic direct writes are guarded', /guard_profile_cosmetic_writes/.test(migration) && /app\.cosmetic_write_authorized/.test(migration)],
  ['public cosmetic projection exposes only public profile cosmetic fields', /public_profile_cosmetics/.test(migration) && /sync_public_profile_cosmetic_projection/.test(migration)],
  ['custom accent picker requires entitlement and a fixed accessible palette', /unlock_custom_accent_picker/.test(migration) && /Choose an accessible colour/.test(migration)],
  ['shop displays an owned collection and equipped state', /Your collection/.test(shop) && /Equipped/.test(shop) && /EQUIPPING_ENABLED = false/.test(shop)],
  ['guests can browse enabled catalog items without accessing account balances', /if \(isGuest\)/.test(shop) && /setBalance\(null\)/.test(shop) && /anonymous users read enabled token spend catalog/.test(migration)],
  ['wallet combines purchase, spend, bonus and reviewed adjustment ledgers', /token_ledger/.test(wallet) && /token_spend_ledger/.test(wallet) && /signup_bonus/.test(wallet) && /token_adjustment_ledger/.test(wallet)],
  ['wallet renders positive and negative activity descriptions', /entry\.description/.test(walletPanel) && /entry\.tokensDelta < 0/.test(walletPanel)],
  ['public profiles load cosmetic projection', /public_profile_cosmetics/.test(profileService)],
  ['profile card renders equipped frames, badges, borders and themes', /equippedFrame/.test(profileCard) && /equippedBadge/.test(profileCard) && /equippedBanner/.test(profileCard) && /equippedBorder/.test(profileCard) && /equippedProfileTheme/.test(profileCard)],
  ['profile accent picker is entitlement-gated and server-validated', /hasCustomAccentPicker/.test(profileDashboard) && /set_profile_custom_accent/.test(profileDashboard)],
];

for (const [label, passed] of checks) {
  console.log((passed ? 'PASS ' : 'FAIL ') + label);
  assert.ok(passed, label);
}
console.log('Token economy static contract checks passed: ' + checks.length + '. Static checks do not replace SQL parsing, staging permissions, concurrency or browser tests.');
