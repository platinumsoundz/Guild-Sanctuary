-- Keep token spending closed until the owner has reviewed the migration chain
-- and authenticated staging tests have proven balance, ownership, idempotency,
-- and ledger consistency. Do not grant authenticated RPC execution in this phase.
-- This migration deliberately reinforces the earlier lock migration rather than
-- reopening spending merely because the UI has a guarded RPC call.

REVOKE ALL ON FUNCTION public.spend_tokens(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spend_tokens(text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.spend_tokens(text, uuid) FROM authenticated;
