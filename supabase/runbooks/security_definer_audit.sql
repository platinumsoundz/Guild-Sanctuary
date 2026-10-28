-- READ-ONLY owner runbook query.
-- Inventory SECURITY DEFINER routines in public, function-level settings, direct PUBLIC
-- grants, and effective EXECUTE privileges for anon/authenticated. Effective privilege
-- checks include PUBLIC grants and role membership. This query does not modify the DB.
-- Run in the approved SQL editor/session and retain redacted results as staging evidence.
-- Review each function's body and caller authorization; do not blanket-revoke grants.

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_userbyid(p.proowner) as function_owner,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, ', '), '(no function-level settings)') as function_settings,
  coalesce(bool_or(a.grantee = 0 and a.privilege_type = 'EXECUTE'), false) as explicit_public_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
where n.nspname = 'public'
  and p.prosecdef
group by n.nspname, p.proname, p.oid, p.proowner, p.prosecdef, p.proconfig
order by
  has_function_privilege('anon', p.oid, 'EXECUTE') desc,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') desc,
  function_name,
  identity_arguments;
