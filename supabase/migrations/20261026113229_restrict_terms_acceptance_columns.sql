-- Prevent clients from supplying or altering the server-recorded acceptance timestamp.
begin;
revoke all on public.terms_acceptances from public, anon, authenticated;
grant select on public.terms_acceptances to authenticated;
grant insert (user_id, terms_version) on public.terms_acceptances to authenticated;
commit;
