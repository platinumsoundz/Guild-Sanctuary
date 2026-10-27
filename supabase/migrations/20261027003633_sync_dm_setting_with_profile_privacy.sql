-- Keep the profile privacy JSON aligned with the saved account setting.
-- The conversation RPC reads account_settings.preferences first; the UI profile
-- also needs to reflect that same value so the toggle and recipient state agree.
begin;

create or replace function public.sync_profile_message_preference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allow_dms boolean := coalesce((new.preferences->>'allowDirectMessages') = 'true', true);
  allow_discovery boolean := coalesce((new.preferences->>'allowProfileDiscovery') = 'true', true);
begin
  update public.profiles
  set allow_direct_messages = allow_dms,
      allow_profile_discovery = allow_discovery,
      privacy = pg_catalog.jsonb_set(
        coalesce(privacy, '{}'::jsonb),
        '{allowDirectMessages}',
        pg_catalog.to_jsonb(allow_dms),
        true
      ),
      updated_at = pg_catalog.now()
  where id = new.user_id;
  return new;
end;
$$;

commit;
