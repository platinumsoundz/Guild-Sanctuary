# Token redemption staging verification runbook

**Owner:** Engineering & Reliability; product owner approves provider/database operations  
**Scope:** Verify the cosmetic token-spend RPC and shop integration in a disposable or isolated staging Supabase project.  
**Non-scope:** Production migration/grants, enabling live payments, changing Stripe configuration, issuing real charges, or altering real member balances.  
**Status:** Prepared runbook; not executed.  
**Dependency:** The token catalog/spend schema and `public.spend_tokens(text, uuid)` must exist in the target staging project. The current application integration and proposed economy completion are in draft PR #296.

## Safety gates

- Use a dedicated staging project and test accounts with no real member data.
- Confirm the project ref and environment before every command. Do not use the production project.
- Review migration history and dry-run output first. `supabase db push` applies every pending local migration, not only the spending-permission migration.
- Never enable live Stripe checkout as part of this test. Token redemption is an internal cosmetic spend, independent of purchasing tokens.
- Do not grant EXECUTE to `PUBLIC` or `anon`. The intended grant is to `authenticated` only.
- Stop if the installed function definition differs from the expected guarded implementation. Do not apply a grant migration to an unreviewed SECURITY DEFINER function.

## 1. Confirm target and migration state

From a trusted local checkout with the Supabase CLI installed:

```sh
supabase projects list
supabase link --project-ref <STAGING_PROJECT_REF>
supabase migration list
supabase db push --dry-run
```

Check the linked project ref explicitly. Review every migration listed by the dry run and resolve unexpected drift before applying anything. Only proceed after the owner has reviewed the target and migration plan.

Apply reviewed migrations to staging only:

```sh
supabase db push
```

There is no permission-opening migration in this batch. The forward-only proposal `supabase/migrations/20261030140000_token_shop_bonus_inventory_review.sql` is repository code only and is NOT APPLIED. It deliberately keeps spend/equip/clear RPC execution revoked. Do not create or apply a grant migration until the owner-approved staging test matrix passes.

## 2. Inspect function security and permissions

Run read-only SQL in the staging SQL editor:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  pg_get_functiondef(p.oid) as function_definition,
  p.proacl as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'spend_tokens';
```

Review the body before granting access. It must validate `auth.uid()`, active-user status, item existence/enabled status, balance, idempotency, and ownership; perform spend ledger, wallet and entitlement changes atomically; and use a locked-down `search_path` (ideally empty with schema-qualified references).

Check effective grants:

```sql
select
  has_function_privilege('authenticated', 'public.spend_tokens(text, uuid)', 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('anon', 'public.spend_tokens(text, uuid)', 'EXECUTE') as anon_can_execute,
  has_function_privilege('public', 'public.spend_tokens(text, uuid)', 'EXECUTE') as public_can_execute;
```

Expected in this batch: authenticated = false; anon = false; public = false. Any change to this expectation requires a separate reviewed migration after all isolated staging tests pass.

## 3. Verify the app-level behavior

Use two dedicated signed-in staging accounts: one with enough tokens and one with an insufficient balance. Ensure each profile is active and that the catalogue contains an enabled cosmetic item and a disabled test item. Never seed or modify production balances.

| Case | Action | Expected result |
| --- | --- | --- |
| Successful spend | Unlock an enabled item with sufficient balance | RPC succeeds; balance decreases by exactly the catalogue price; one spend ledger record and one entitlement exist |
| Equipment | Buy a cosmetic kind that auto-equips | Entitlement exists and only the corresponding equipped profile field changes |
| Insufficient balance | Attempt an item priced above the test wallet balance | Clear error; balance, spend ledger, entitlement and equipped fields remain unchanged |
| Already owned | Attempt to unlock an item already owned | No second charge; existing entitlement remains |
| Disabled item | Call RPC for a disabled catalogue item | Rejected; no wallet/ledger/entitlement changes |
| Invalid item | Call RPC with a nonexistent item ID | Rejected; no state changes |
| Idempotency replay | Repeat the same item with the same UUID key | The second call reports already applied and does not charge twice |
| Key collision | Reuse a key that was used for a different item | Rejected; no second charge |
| Anonymous access | Call the RPC without an authenticated user | Rejected; no state changes |
| Stale UI | Refresh after success and revisit the shop | Server wallet and owned-item state remain consistent |
| Parallel requests | Send two independent purchases near-simultaneously with a balance sufficient for only one | At most one purchase succeeds; balance never becomes negative |

For every negative test, compare the wallet balance, spend ledger, entitlement rows, and equipped profile fields before and after. Check records only for the dedicated test users. Do not capture personal data or secrets in evidence.

## 4. Evidence and release decision

Record:
- staging project ref (not a credential), migration versions applied, commit SHA, and timestamp;
- test account aliases only (never email addresses or UUIDs);
- pass/fail for each case and sanitized error messages;
- before/after counts and balance deltas for the test accounts;
- independent reviewer and unresolved issues.

A successful typecheck/build is not proof of correct database behavior. A successful RPC smoke test is not proof of all negative paths. Keep redemption disabled for real members until the migration, independent security review, and staging matrix pass. Keep live token purchases off until separate payment, refund/dispute, legal and hosting release gates pass.

## Rollback

If a staging test fails, stop further test purchases and keep the feature unavailable. Revert the application PR or disable the shop action in a follow-up code change. Do not delete ledger rows or manually refund balances to make a test pass. For permission rollback, prepare and review a separate migration that revokes authenticated EXECUTE; do not improvise destructive SQL in a live project.


## October 30 completion-batch additions (NOT APPLIED)

The draft PR adds migration `20261030140000_token_shop_bonus_inventory_review.sql`. Review it in a disposable staging project only after checking the target ref and full migration dry-run. It:
- Reconciles the sale catalogue to the eight approved staging items and disables the legacy twelve demo items without deleting old entitlements.
- Adds bonus ledger/program tables, verified-account triggers and the closed-by-default first-100 allocator.
- Adds support-only audited spending holds and checks those holds before spend/equip/custom accent operations.
- Adds equipment slots and a privacy-safe public cosmetic projection.
- Adds a contrast-tested preset accent picker that requires the relevant entitlement.
- Keeps `spend_tokens`, `equip_profile_cosmetic`, and `clear_profile_cosmetic` execution revoked. The custom accent RPC alone is granted to authenticated users, and only after checking entitlement and approved palette values.

To open the bonus program in staging only, after the migration is applied and test accounts are ready, an owner must explicitly set both fields in the staging SQL editor:
```sql
update public.token_bonus_program
set beta_open = true, opened_at = now(), updated_at = now()
where singleton = true;
```
To close it:
```sql
update public.token_bonus_program
set beta_open = false, updated_at = now()
where singleton = true;
```
Never run the opening statement in production as part of this PR. Verify exactly 100 grants under concurrent load and that account creation before the open timestamp is ineligible. The migration is a proposal only until Ashley confirms the staging target and applies it.
