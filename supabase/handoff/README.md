# Supabase SQL handoff

This folder is the durable, copy-paste-ready SQL handoff for The Sanctuary. It exists because the project owner applies migrations through the Supabase Dashboard SQL Editor, not through the Supabase CLI.

**Status: none of these files have been applied to the project. Nothing here has been validated in staging. Live token checkout must stay disabled.**

## Which file do I use?

| Situation | File to use |
| --- | --- |
| The project already has the social/community schema and only the token wallet is missing | `economy_migrations.sql` |
| The project is brand new and has no Sanctuary schema at all | `all_migrations.sql` |
| You are not sure what is already applied | Run `verify_all.sql` first, then apply only the missing migration files in filename order |

Do not run `all_migrations.sql` on a project that already has some Sanctuary tables. It is a fresh-project script and will stop at the first object that already exists.

## Integrity check

Run `npm run check:sql-handoff` after changing a migration. It fails if a combined file contains a Markdown fence, does not start with `begin;` and end with `commit;`, or omits a migration file.

## Copy-paste rules

1. Open the `.sql` file in the repository.
2. Select the SQL text from the first line to the last line.
3. Do **not** copy Markdown fences. The text must not contain three backticks, the word `math`, or a language label.
4. In Supabase, open **SQL Editor → New query**.
5. Paste the SQL.
6. Click **Run**.
7. Wait for **“Success. No rows returned.”**
8. Run the matching verification file.

If the SQL Editor reports an error near three backticks, the clipboard contains Markdown formatting instead of SQL. Clear the editor and copy the plain `.sql` file again. Do not try to “fix” the SQL by deleting random lines.

## What each migration does

Apply in filename order. These are the current migration files:

1. `20261009000000_social_core_and_moderation.sql` — profiles, posts, shorts, events, conversations, messages, reports, moderation actions, audit events, RLS.
2. `20261009000100_community_tips.sql` — optional community tip reconciliation table.
3. `20261009000200_private_vault_and_media_storage.sql` — encrypted private vault and media storage policies.
4. `20261009000300_persistent_social_content.sql` — persistent social content, aggregate helpers, cleanup triggers.
5. `20261010000000_unify_sanctuary_scope.sql` — normalizes legacy world-scoped data to Sanctuary.
6. `20261011000000_repair_social_engagement_insert_policies.sql` — repairs authenticated like/comment insert policies.
7. `20261012000000_token_wallet_and_fulfillment.sql` — token wallets, purchase ledger, service-role fulfilment RPC.
8. `20261013000000_short_engagement_stats.sql` — Shorts like/count RPCs.
9. `20261023000000_harden_policies_and_views.sql` — aggregate views, discovery indexes, storage hardening.
10. `20261024000000_token_spending.sql` — spend catalog, spend ledger, entitlements, `spend_tokens`.
11. `20261024000001_signup_token_bonus.sql` — 100-token signup grant and pre-live backfill.
12. `20261024000002_profile_cosmetics.sql` — 12-item cosmetic catalog, equipped slots, equip/clear RPCs, public profile view.
13. `20261026000000_token_purchase_age_gate.sql` — 18+ purchase verification, `log_audit_event`, `confirm_token_purchase_age`.
14. `20261026000100_token_refund_clawback.sql` — refund/dispute events, `record_token_refund`, purchase-review queue.
15. `20261026000200_account_deletion_grace_period.sql` — seven-day deletion schedule/restore/purge and content visibility flags.
16. `20261026000300_terms_acceptance.sql` — terms version/timestamp, signup carry-through, `record_terms_acceptance`.
17. `20261026000400_admin_dashboard.sql` — appeals, internal notes, member search/overview, role management, audit browsing.

## Immediate economy path

If the only known error is `relation "public.token_wallets" does not exist`, use `economy_migrations.sql`. It contains migrations 7, 10, 11, 12, 13, and 14 in one transaction. It assumes the social schema and `profiles` table already exist.

After it succeeds, run `verify_economy.sql`. Expected results:

- seven economy tables (including refund events and purchase reviews)
- six economy functions (including `record_token_refund`)
- the `purchase_age_verified_at` column on `profiles`
- four `equipped_*` columns on `profiles`
- four `equipped_*` columns on `public_profiles`
- 12 enabled catalog rows
- RLS enabled on the seven economy tables
- existing test profiles with a 100-token wallet

Then run:

    notify pgrst, 'reload schema';

This only refreshes the API schema cache. It does not create tables or functions.

## Fresh-project path

Use `all_migrations.sql` only on an empty project. It wraps all 17 migrations in one transaction and strips the inner `begin;`/`commit;` pairs. If any statement fails, the whole transaction rolls back.

After it succeeds, run `verify_all.sql`, then `notify pgrst, 'reload schema';`.

## Common errors

| Error | Meaning | Fix |
| --- | --- | --- |
| `syntax error at or near "```"` or `near "```math"` | Markdown fences were copied into the SQL Editor. | Clear the editor and copy the plain `.sql` file. Do not copy chat formatting. |
| `relation "public.token_wallets" does not exist` | The wallet migration is missing. | Run `economy_migrations.sql`. |
| `type "world_type" already exists` | The social schema is already applied. | Do not run `all_migrations.sql`; run only the missing migration files. |
| `function public.spend_tokens(...) does not exist` | The spending migration is missing or the API cache is stale. | Run `economy_migrations.sql`, then `notify pgrst, 'reload schema';`. |
| `constraint ... already exists` | A file was partially applied or run twice. | Stop and compare with `verify_all.sql`. Do not delete constraints manually. |
| `permission denied` | The SQL Editor is not using the project owner. | Use the project owner account. |

## What remains disabled after these migrations

- Free 100-token signup grants work.
- Profile cosmetics can be purchased with tokens.
- Live token checkout remains disabled by default.
- Refund/chargeback reversal is not implemented.
- The 18+ purchase gate is not implemented.
- The 7-day account-deletion grace period is not implemented.
- The full admin dashboard is not implemented.
- Legal acceptance and approved Terms are not implemented.

Do not enable live token sales until those items are built, reviewed, and tested.
