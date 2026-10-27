# Token redemption staging verification runbook

**Owner:** Engineering & Reliability; product owner approves provider/database operations  
**Scope:** Verify the cosmetic token-spend RPC and shop integration in a disposable or isolated staging Supabase project.  
**Non-scope:** Production migration/grants, enabling live payments, changing Stripe configuration, issuing real charges, or altering real member balances.  
**Status:** Prepared runbook; not executed.  
**Dependency:** The token catalog/spend schema and `public.spend_tokens(text, uuid)` must exist in the target staging project. The application integration is in draft PR #122.

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

The migration in PR #122 is `supabase/migrations/20261027120000_grant_authenticated_token_spending.sql`. It is repository code until applied. After application, refresh PostgREST schema cache only if needed; a cache refresh does not create missing objects.

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

Expected after the reviewed migration: authenticated = true; anon = false; public = false. If the function definition is unsafe or permissions differ, stop and request review rather than improvising grants.

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
