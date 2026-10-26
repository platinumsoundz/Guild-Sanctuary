-- Keep the moderator helper executable for authenticated RLS checks, not anonymous callers.
revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;
