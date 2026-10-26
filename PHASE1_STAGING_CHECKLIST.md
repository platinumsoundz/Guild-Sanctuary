# Phase 1 staging checklist

This is the runbook for the launch gates that are **implemented in code but not
validated**: the 18+ purchase gate, refund/chargeback clawback, the seven-day
account deletion grace period, terms acceptance, and the admin dashboard.

Nothing in this file has been executed. Do not mark any item done until the
result was actually observed against a real project.

Related documents: `SUPABASE_SQL_HANDOFF.md`, `supabase/handoff/README.md`,
`MASTER_BLUEPRINT.md`, `ADSENSE_SETUP.md`.

## What this does not cover

- Live card payments. Keep `TOKEN_CHECKOUT_ENABLED=false` and use Stripe test
  mode only.
- AdSense, the Support donation link, or Cloudflare/Vercel deployment.
- Approved legal text. `/terms` is still a draft, so `NEXT_PUBLIC_TERMS_REQUIRED`
  stays `false` even after this checklist passes.

## 0. Preconditions

- A **disposable** Supabase project (or a staging project you can reset).
- Node dependencies installed, `npm run lint`, `npm run typecheck`,
  `npm test -- --run`, `npm run check:sql-handoff`, and `npm run build` passing
  locally for the revision under test.
- Stripe **test-mode** secret key, webhook signing secret, and the three Price
  IDs. Never paste secrets into chat or into the repository.
- Server-only environment values set on the host, not in `NEXT_PUBLIC_*`:
  `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `APP_BASE_URL`, and `ACCOUNT_PURGE_SECRET` (at least 32 characters).

## 1. Apply the migrations

Run `supabase migration list` first. The last time this was checked, the
parallel database/auth branch had deleted two earlier Terms migration filenames
(`20261026110000_terms_acceptance_records.sql`,
`20261026113500_restrict_terms_acceptance_columns.sql`). If the project recorded
one of those, the versions will not match the files in `supabase/migrations/`.

Then, on the disposable project only:

```sh
supabase link --project-ref <DISPOSABLE_PROJECT_REF>
supabase migration list
supabase db push --dry-run
supabase db push
```

`db push` applies **every** pending migration, not just Phase 1. Alternatively
paste `supabase/handoff/all_migrations.sql` into a brand-new project, or
`supabase/handoff/economy_migrations.sql` when only the token schema is missing.

Finish with `supabase/handoff/verify_all.sql` and
`supabase/handoff/verify_economy.sql`, then:

```sql
notify pgrst, 'reload schema';
```

`NOTIFY` refreshes the API cache; it does not create missing objects.

Expected from the verify files:

- `terms_acceptances` exists with `id`, `user_id`, `terms_version`,
  `accepted_at`.
- `profiles` has `purchase_age_verified_at`, `deletion_requested_at`,
  `deletion_purge_after`.
- `account_deletion_requests`, `moderation_appeals`, `moderation_notes`,
  `token_refund_events`, `token_purchase_reviews` exist.
- `confirm_token_purchase_age`, `record_token_refund`,
  `request_account_deletion`, `cancel_account_deletion`,
  `purge_due_account_deletions`, `admin_*`, and `admin_list_terms_acceptances`
  exist.
- No `record_terms_acceptance` function. That design was replaced by
  `terms_acceptances`.

## 2. Deploy the Edge Functions

```sh
supabase functions deploy token-checkout
supabase functions deploy stripe-token-webhook --no-verify-jwt
```

Set the secrets with `supabase secrets set`, never in the client bundle. Point
the Stripe test webhook at the deployed function URL and subscribe to
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`charge.refunded`, and `charge.dispute.created`.

## 3. 18+ purchase gate

| Step | Expected |
| --- | --- |
| Open Wallet with a fresh member, confirm a date of birth under 18 | Rejected: "Token purchases are only available to members aged 18 or over." `purchase_age_verified_at` stays null. |
| Confirm a date of birth over 18 | Accepted; `profiles.purchase_age_verified_at` is set; bundle buttons become available. |
| Repeat with the same account | Still accepted; the timestamp updates. The date of birth itself is **not** stored anywhere. |
| Submit a future date or a date older than 120 years | Rejected with a validation error. |
| Call `token-checkout` for an account with a null `purchase_age_verified_at` | Function refuses to create a session. |
| Call `token-checkout` from a preview origin | Rejected: `Origin` must equal `APP_BASE_URL` exactly. |
| Complete a test-mode purchase | Tokens granted once; a duplicate webhook delivery does not double-grant. |

## 4. Refund and chargeback clawback

Record the wallet balance, ledger rows, and history rows before each case.

| Case | Expected |
| --- | --- |
| Full refund on a purchase whose tokens are unspent | Balance reduced by the purchase amount; a negative "Refund clawback" entry appears in the member's Wallet history; no review row. |
| Full refund where some tokens were spent | Balance reduced to zero, never negative; `token_purchase_reviews` gets a `spent_tokens` row with the shortfall; a "under review" history label appears. |
| Partial refund | **No** automatic debit; a `partial_refund` review row is created. |
| Dispute created | Treated as a full clawback; a `dispute` history entry. |
| Same Stripe event delivered twice | `record_token_refund` returns the stored result; the balance changes once. |
| Second full refund event for the same session | No second debit. |
| Refund for a session that is not a token purchase | No balance change; the webhook acknowledges it because the Checkout Session metadata is not a token bundle. |
| Refund event arrives before the purchase ledger row | The webhook returns 5xx so Stripe retries; the clawback is recorded on the retry instead of being acknowledged and lost. |

Confirm the purchased cosmetic is still owned and equipped in every case.

Known limitation: a dispute that is later **won** is not re-credited
automatically. `dispute_won` exists in the review reason list but no handler
creates it yet. Decide the policy before live sales.

## 5. Seven-day deletion grace period

| Step | Expected |
| --- | --- |
| Delete with the wrong email or phrase | Rejected, nothing scheduled. |
| Delete with 2FA enabled and no/incorrect code | Rejected with 403. |
| Delete correctly | `account_deletion_requests` row with `purge_after` seven days out; profile and posts hidden immediately. |
| Sign in during the grace period | `AccountDeletionNotice` shows the purge date; "Restore" clears `cancelled_at` and the account is visible again. |
| Suspended member restores | The previous moderation status and `suspended_until` come back; restoring never clears a suspension or a ban, and the session ends instead of staying signed in as a shell. |
| `POST /api/account/purge` without the secret | 401. |
| `POST /api/account/purge` with the secret before `purge_after` | Nothing purged. |
| `POST /api/account/purge` after `purge_after` | Media removed from storage, auth user deleted, wallet/ledger/unlocks cascade away. |
| No purge run for days after `purge_after` | The account does not become usable again: the grace-period suspension has no end date, the profile stays private, and content stays hidden. Only the deletion notice is reachable. |
| Force a media-deletion failure | The account stays hidden and queued; the run reports it under `failed`; the next run retries. No orphaned objects and no deleted auth user pointing at them. |

The purge route is the only permanent deletion path. Signing in must never
delete an account early. `removeUserMedia` lists the `<userId>/` prefix in
`community-media`; uploads are written as
`<userId>/<posts|shorts>/<uuid>.<ext>` in
`src/services/supabase/communityMedia.ts`, so the prefix matches. If a future
upload path stops using a `userId` prefix (for example an avatar bucket), the
purge list must be extended or those objects will be orphaned.

Scheduling it: any scheduler that can send an `Authorization: Bearer
<ACCOUNT_PURGE_SECRET>` POST to `/api/account/purge` will do (Cloudflare Cron
Trigger, an external cron, or a Supabase scheduled function). Run it daily at
most; it processes up to 20 accounts per call and returns `{ purged, failed }`.
Do not put the secret in `NEXT_PUBLIC_*` values or client code, and do not
expose the route to the browser.

## 6. Terms acceptance

| Step | Expected |
| --- | --- |
| `NEXT_PUBLIC_TERMS_REQUIRED=false` (default) | Signup shows a draft notice, no checkbox, and **no** `terms_acceptances` row is written. `/terms` stays a marked draft. |
| `NEXT_PUBLIC_TERMS_REQUIRED=true` with a fresh signup | Checkbox is required; after signup one row exists with `accepted_at` set by PostgreSQL, not the browser. |
| Existing member with no row signs in while the flag is on | `TermsAcceptanceGate` blocks the app; accepting writes one row and continues. |
| Accepting twice | The unique `(user_id, terms_version)` constraint keeps one row; no error is shown. |
| Insert with a different `terms_version` | Rejected by the `terms_acceptances` CHECK constraint. |
| Client tries to set `id` or `accepted_at` | Rejected: only `user_id` and `terms_version` are insertable. |
| Moderator opens Members → the member | The Terms line lists the recorded version and date, or "no recorded acceptance". Token history includes refund/chargeback clawbacks and the shortfall/review flags. |

The version string is pinned in three places: `src/modules/auth/terms.ts`,
the migration CHECK constraint, and the signup metadata. Changing it needs a
migration and a client release together.

## 7. Admin and moderation dashboard

| Step | Expected |
| --- | --- |
| Plain member navigates to Moderation | Not in navigation; the dashboard refuses access. |
| Moderator | Reports, Members, Appeals, Refund reviews, Audit log. Role controls are admin-only. |
| Admin changes a role | Applied and audited. An admin cannot change their own role. The last admin cannot be demoted. |
| Moderator tries to suspend or ban an administrator | Rejected with a permissions error; no moderation action is recorded. |
| Any moderator tries to suspend or ban their own account | Rejected. |
| Member submits an appeal from Settings | Visible in the moderator Appeals tab with status. One open appeal at a time. |
| Moderator resolves an appeal | Status and resolution notes appear for the member. |
| Refund review resolved or dismissed | Row leaves the open queue and the decision is audited. |
| Audit log | Shows the age confirmation, report actions, refunds, role changes, and deletions. |

## 8. Rollback and reset

- Re-run on a fresh disposable project instead of repairing a half-migrated one.
- Do not hand-delete constraints or tables to "fix" a failed migration; compare
  against `verify_all.sql` first.
- If a migration partially applied, the safest reset is a new project plus
  `supabase/handoff/all_migrations.sql`.

## 9. Record the result

For each section, capture the revision hash, the project ref, the command or
click path, and the observed result. Update `MASTER_BLUEPRINT.md`,
`AI_RESTORE_PROMPT.md`, and `RECOVERY_MEMORY.md` with what actually passed.
Anything not observed stays "unverified".
