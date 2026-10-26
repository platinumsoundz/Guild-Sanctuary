# Supabase SQL handoff

Last updated: 2026-10-26

This is the durable handoff for every SQL command the project currently knows about. It is written for the Supabase Dashboard SQL Editor. The project owner does not need to open individual migration files.

**Status: no SQL has been applied to the user’s project. No staging validation has run. Live token checkout stays disabled.**

## Start here

Open the handoff folder:

- `supabase/handoff/README.md` — step-by-step guide, file chooser, copy-paste rules, troubleshooting.
- `supabase/handoff/economy_migrations.sql` — the six token-wallet/economy migrations in one transaction (wallet, spending, signup bonus, cosmetics, 18+ age gate, refund clawback). Use this when the social schema already exists and `public.token_wallets` is missing.
- `supabase/handoff/all_migrations.sql` — all 17 migrations in one transaction. Use this only on a brand-new project.
- `supabase/handoff/verify_economy.sql` — read-only checks for the economy tables, functions, columns, catalog, RLS, and wallets.
- `supabase/handoff/verify_all.sql` — read-only checks for the full schema, views, functions, RLS, indexes, and storage buckets.

The migration files themselves remain the source of truth in `supabase/migrations/`. The handoff files are generated copies for paste-ready use. Run `npm run check:sql-handoff` after changing either source: it fails if a combined file contains a Markdown fence, does not start with `begin;`/end with `commit;`, or omits a migration.

## The one rule that caused the earlier failures

The SQL Editor must receive SQL, not Markdown. If the clipboard contains three backticks, the word `math`, or a language label, the editor will fail with `syntax error at or near "```"` or `near "```math"`.

Copy the plain `.sql` file. Do not copy a chat message’s formatting. Do not copy a code fence. The SQL itself never needs Markdown.

## Apply the economy migrations

1. Sign in at <https://supabase.com/dashboard>.
2. Select the Guild Sanctuary project.
3. Open **SQL Editor → New query**.
4. Open `supabase/handoff/economy_migrations.sql` in the repository.
5. Select all of the file and copy it.
6. Paste into the SQL Editor.
7. Click **Run**.
8. Wait for **“Success. No rows returned.”**
9. Run `supabase/handoff/verify_economy.sql` one block at a time.
10. Run:

        notify pgrst, 'reload schema';

The last command only refreshes the API cache. It does not create missing tables or functions.

## Apply the full schema on a fresh project

Only use this on an empty project. If any Sanctuary table already exists, use the per-file migration order instead.

1. Open `supabase/handoff/all_migrations.sql`.
2. Copy the whole file.
3. Paste into a new SQL Editor query.
4. Click **Run**.
5. Run `supabase/handoff/verify_all.sql`.
6. Run `notify pgrst, 'reload schema';`.

## Current migration inventory

| Order | File | Main objects |
| --- | --- | --- |
| 1 | `20261009000000_social_core_and_moderation.sql` | profiles, posts, shorts, events, conversations, messages, reports, moderation, audit, RLS |
| 2 | `20261009000100_community_tips.sql` | community tip reconciliation |
| 3 | `20261009000200_private_vault_and_media_storage.sql` | private vault, media buckets/policies |
| 4 | `20261009000300_persistent_social_content.sql` | persistent social content, aggregate helpers, cleanup triggers |
| 5 | `20261010000000_unify_sanctuary_scope.sql` | Sanctuary scope normalization |
| 6 | `20261011000000_repair_social_engagement_insert_policies.sql` | like/comment insert policy repair |
| 7 | `20261012000000_token_wallet_and_fulfillment.sql` | wallets, purchase ledger, fulfilment RPC |
| 8 | `20261013000000_short_engagement_stats.sql` | Shorts like/count RPCs |
| 9 | `20261023000000_harden_policies_and_views.sql` | aggregate views, discovery indexes, storage hardening |
| 10 | `20261024000000_token_spending.sql` | spend catalog/ledger/entitlements, `spend_tokens` |
| 11 | `20261024000001_signup_token_bonus.sql` | 100-token signup grant, backfill |
| 12 | `20261024000002_profile_cosmetics.sql` | 12-item cosmetic catalog, equipped slots, equip/clear RPCs |
| 13 | `20261026000000_token_purchase_age_gate.sql` | 18+ purchase verification, `log_audit_event` |
| 14 | `20261026000100_token_refund_clawback.sql` | refund/dispute events, `record_token_refund`, purchase reviews |
| 15 | `20261026000200_account_deletion_grace_period.sql` | seven-day deletion schedule/restore/purge, content visibility flags |
| 16 | `20261026000300_terms_acceptance.sql` | terms version/timestamp, `record_terms_acceptance` |
| 17 | `20261026000400_admin_dashboard.sql` | appeals, notes, member search/overview, roles, audit browsing |

## Verification expectations

Economy checks:

- seven tables: `token_wallets`, `token_ledger`, `token_spend_catalog`, `token_spend_ledger`, `token_entitlements`, `token_refund_events`, `token_purchase_reviews`
- six functions: `record_token_bundle_purchase`, `spend_tokens`, `equip_profile_cosmetic`, `clear_profile_cosmetic`, `grant_signup_token_bonus`, `record_token_refund`
- `purchase_age_verified_at` on `profiles`
- four profile columns: `equipped_frame`, `equipped_effect`, `equipped_badge`, `equipped_banner`
- four matching columns on `public_profiles`
- 12 enabled catalog rows
- RLS enabled on the seven economy tables
- existing test profiles with a 100-token wallet

Full-schema checks also cover `account_deletion_requests`, `moderation_appeals`, `moderation_notes`, the terms columns, the deletion visibility flags, and the admin RPCs.

## Known error → fix

| Error | Fix |
| --- | --- |
| `syntax error at or near "```"` or `near "```math"` | Copy the plain `.sql` file. Do not copy chat fences. |
| `relation "public.token_wallets" does not exist` | Run `economy_migrations.sql`. |
| `type "world_type" already exists` | Do not run `all_migrations.sql`; apply only missing files. |
| `function public.spend_tokens(...) does not exist` | Run the economy migrations, then `notify pgrst, 'reload schema';`. |
| `constraint ... already exists` | Stop and compare with `verify_all.sql`; do not delete constraints manually. |
| `permission denied` | Use the project owner account in the SQL Editor. |

## Still blocked after SQL

Applying SQL does not make the product launch-ready. These remain code-only or unimplemented:

- refund/chargeback clawback and manual-review flagging
- 18+ token purchase gate
- 7-day account-deletion grace period and restore flow
- full admin dashboard: reports, suspend/ban, wallet history, audit log, appeals/notes, role management
- approved Terms/Privacy and durable signup acceptance
- staging validation of RLS, Edge Functions, webhook idempotency, and test-mode checkout

Keep `TOKEN_CHECKOUT_ENABLED=false` and do not enable live sales until those are complete and reviewed.
