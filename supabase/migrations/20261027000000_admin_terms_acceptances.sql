-- Let moderators review a member's recorded Terms acceptances.
--
-- Acceptances live in public.terms_acceptances (20261026113205), which is
-- readable only by the owning account. This RPC is the moderator-facing read
-- path and is deliberately separate from admin_member_overview so the overview
-- still works on projects where the Terms table has not been applied.
begin;

create or replace function public.admin_list_terms_acceptances(requested_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.current_moderation_role() is null then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;

  if to_regclass('public.terms_acceptances') is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'terms_version', t.terms_version,
      'accepted_at', t.accepted_at
    ) order by t.accepted_at desc)
    from public.terms_acceptances t
    where t.user_id = requested_user_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_list_terms_acceptances(uuid) from public, anon, authenticated;
grant execute on function public.admin_list_terms_acceptances(uuid) to authenticated;

commit;
