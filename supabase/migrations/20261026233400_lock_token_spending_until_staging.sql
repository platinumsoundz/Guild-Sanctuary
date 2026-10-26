-- Keep token redemption closed until isolated staging, reversal handling,
-- account deletion behavior, and the shared game-wallet bridge are verified.
begin;

-- The catalogue and user-owned records are read-only through the public API.
-- No anonymous access is needed for wallet, ledger, entitlement, or spend history.
revoke all privileges on table
  public.token_wallets,
  public.token_ledger,
  public.token_spend_catalog,
  public.token_spend_ledger,
  public.token_entitlements
from public, anon, authenticated;

grant select on table
  public.token_wallets,
  public.token_ledger,
  public.token_spend_catalog,
  public.token_spend_ledger,
  public.token_entitlements
to authenticated;

-- Do not expose account-bound spending/equipment mutations through PostgREST
-- until the staged shop and reversal flow have passed end-to-end tests.
revoke execute on function public.spend_tokens(text, uuid)
  from public, anon, authenticated;
revoke execute on function public.equip_profile_cosmetic(text)
  from public, anon, authenticated;
revoke execute on function public.clear_profile_cosmetic(text)
  from public, anon, authenticated;

commit;
