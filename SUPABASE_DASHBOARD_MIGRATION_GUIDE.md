# Supabase Dashboard migration guide

This guide applies the token-wallet, token-spending, signup-bonus, and profile-cosmetics migrations through the Supabase Dashboard. It is written for the current project, which contains test data only.

> **Paste-ready files:** `supabase/handoff/economy_migrations.sql` contains the four economy migrations in one transaction. `supabase/handoff/all_migrations.sql` contains all 12 migrations for a fresh project. The full handoff, including verification queries and error fixes, is in `SUPABASE_SQL_HANDOFF.md`.

> **Stop before applying if this project contains real user accounts or real payment data.** Use a separate staging project instead. Do not enable live Stripe checkout during this setup.

## 1. Before you start

1. Sign in at <https://supabase.com/dashboard>.
2. Select the Guild Sanctuary project.
3. Open **Database → Backups** and create a backup if your plan offers it.
4. If a backup is not available, do not apply these changes until you have another way to restore the project.
5. Open **SQL Editor** from the left sidebar.

The migrations are transactional. If one statement fails, that file should roll back. Do not work around an error by running only part of a file.

## 2. Check which migrations are already applied

Paste this into a new SQL Editor query and click **Run**:

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

Compare the result with the files in `supabase/migrations/`. Apply missing files in filename order. The economy files must be applied in this order:

1. `20261012000000_token_wallet_and_fulfillment.sql`
2. `20261024000000_token_spending.sql`
3. `20261024000001_signup_token_bonus.sql`
4. `20261024000002_profile_cosmetics.sql`

If this is a fresh project and earlier migrations are missing, apply **all** migration files in filename order, not just the four economy files. Ask for help rather than skipping an earlier schema migration.

## 3. Apply each file

For each migration:

1. Open the file in the repository.
2. Select the whole file and copy it.
3. In Supabase, open **SQL Editor → New query**.
4. Paste the complete file.
5. Click **Run**.
6. Wait for the success message. A successful schema migration usually says **“Success. No rows returned.”**
7. Do not paste the next file until the current one succeeds.

If you cannot open the files yourself, use the plain `.sql` files in `supabase/handoff/` or ask OpenCode to print the next migration. Copy only the SQL text. Do not copy Markdown fences, three backticks, or a language label; those cause `syntax error at or near "```"` in the SQL Editor.

### File 1 — wallet and Stripe fulfilment

`supabase/migrations/20261012000000_token_wallet_and_fulfillment.sql`

Creates:

- `token_wallets`
- `token_ledger`
- `record_token_bundle_purchase`

### File 2 — token spending

`supabase/migrations/20261024000000_token_spending.sql`

Creates:

- `token_spend_catalog`
- `token_spend_ledger`
- `token_entitlements`
- `profiles.equipped_frame`
- `spend_tokens`

### File 3 — 100-token signup grant

`supabase/migrations/20261024000001_signup_token_bonus.sql`

Creates the signup trigger and backfills existing profiles without a wallet. Existing test accounts should receive 100 tokens once.

### File 4 — profile cosmetics

`supabase/migrations/20261024000002_profile_cosmetics.sql`

Adds:

- animated frame, effect, emoji-badge, and GIF-banner catalog items
- `profiles.equipped_effect`
- `profiles.equipped_badge`
- `profiles.equipped_banner`
- `equip_profile_cosmetic`
- `clear_profile_cosmetic`
- the updated `public_profiles` view

## 4. Verify the schema

Run each query separately in the SQL Editor.

### Tables

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'token_wallets',
    'token_ledger',
    'token_spend_catalog',
    'token_spend_ledger',
    'token_entitlements'
  )
order by table_name;
```

Expected: all five table names.

### Functions

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'record_token_bundle_purchase',
    'spend_tokens',
    'equip_profile_cosmetic',
    'clear_profile_cosmetic',
    'grant_signup_token_bonus'
  )
order by routine_name;
```

Expected: all five function names.

### Profile columns

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name like 'equipped_%'
order by column_name;
```

Expected: `equipped_badge`, `equipped_banner`, `equipped_effect`, `equipped_frame`.

### Public profile view

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'public_profiles'
  and column_name like 'equipped_%'
order by column_name;
```

Expected: the same four columns.

### Catalog

```sql
select item_id, kind, price_tokens, enabled, sort_order
from public.token_spend_catalog
order by sort_order, price_tokens;
```

Expected: 12 enabled rows:

- frames at 300 tokens
- effects at 200–250 tokens
- badges at 150 tokens
- GIF banners at 300 tokens

### Existing test wallets

```sql
select p.username, w.balance_tokens
from public.profiles p
left join public.token_wallets w on w.user_id = p.id
order by p.username;
```

Existing test accounts should show a 100-token wallet. New profiles receive the grant through the trigger.

## 5. Refresh the API schema cache

After all files succeed, run:

```sql
notify pgrst, 'reload schema';
```

This only refreshes the API cache. It does not create missing tables or functions.

## 6. Test the app

Use a test account, not a real customer account.

1. Sign in and open **Wallet**.
2. Confirm the balance shows 100 tokens for a new/existing pre-live account.
3. Buy the 150-token sparkle badge.
4. Confirm the balance drops by 150 and the badge appears beside the display name.
5. Buy a frame or effect and confirm it appears around the profile picture.
6. Equip a different owned cosmetic and confirm the previous one is replaced.
7. Reload the page and confirm the equipped item persists.
8. Make the profile public with discovery enabled, then confirm Discover shows the badge/frame/effect.
9. Confirm bundle purchase buttons remain disabled while `TOKEN_CHECKOUT_ENABLED=false`.

Do not test with live Stripe keys. Do not enable checkout yet.

## 7. Troubleshooting

| Message | Meaning | What to do |
| --- | --- | --- |
| `relation "public.token_wallets" does not exist` | The wallet migration was skipped. | Apply File 1 first. |
| `function public.spend_tokens(...) does not exist` | The spending migration was skipped or the schema cache is stale. | Apply File 2, then run the cache refresh. |
| `constraint ... already exists` | A file was partially applied outside a transaction, or was run twice in an unusual state. | Stop and share the exact error. Do not delete constraints manually. |
| `column ... does not exist` | An earlier migration is missing. | Check applied versions and apply missing files in order. |
| `permission denied` | You are not using the SQL Editor as the project owner. | Use the project owner account. |

## 8. What remains disabled

After these migrations:

- Free signup tokens work.
- Profile cosmetics can be purchased with tokens.
- Live token checkout remains **disabled**.
- Refund/chargeback reversal is **not implemented**.
- The 18+ purchase gate is **not implemented**.
- The 7-day account-deletion grace period is **not implemented**.
- The full admin dashboard is **not implemented**.

Do not enable live token sales until those items are built and tested.
