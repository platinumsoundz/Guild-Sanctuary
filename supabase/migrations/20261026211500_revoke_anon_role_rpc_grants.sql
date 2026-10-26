-- Restrict role-administration RPCs to signed-in users.
-- Function bodies also verify auth.uid() and the caller's stored role.
revoke all on function public.is_moderator() from anon;
revoke all on function public.search_members_for_admin(text) from anon;
revoke all on function public.set_member_role(uuid, text) from anon;

grant execute on function public.is_moderator() to authenticated;
grant execute on function public.search_members_for_admin(text) to authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;
