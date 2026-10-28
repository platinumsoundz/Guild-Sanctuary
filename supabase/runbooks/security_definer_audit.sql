-- READ-ONLY owner runbook query.
-- Inventory SECURITY DEFINER routines exposed in public, their function-level settings,
-- and effective EXECUTE grants. This query does not modify the database.
-- Run only in the approved Supabase SQL editor/session and save redacted results with the
-- staging acceptance evidence. Review each row; a missing search_path or unexpected grant
-- requires investigation, not an automatic blanket revoke.

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_userbyid(p.proowner) as function_owner,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, ', '), '(no function-level settings)') as function_settings,
  coalesce(bool_or(a.grantee = 0 and a.privilege_type = 'EXECUTE'), false) as public_execute,
  coalesce(bool_or(r.rolname = 'anon' and a.privilege_type = 'EXECUTE'), false) as anon_execute,
  coalesce(bool_or(r.rolname = 'authenticated' and a.privilege_type = 'EXECUTE'), false) as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
left join pg_roles r on r.oid = a.grantee
where n.nspname = 'public'
  and p.prosecdef
group by n.nspname, p.proname, p.oid, p.proowner, p.prosecdef, p.proconfig
order by
  public_execute desc,
  anon_execute desc,
  function_name,
  identity_arguments;
