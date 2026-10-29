-- Provide moderators a narrow, audited context view without exposing private profile columns.
create or replace function public.get_moderation_report_context(
  requested_target_type public.report_target_type,
  requested_target_id uuid
)
returns table (
  owner_id uuid,
  owner_name text,
  owner_username text,
  preview text,
  content_created_at timestamptz,
  content_state text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_owner uuid;
  found_preview text;
  found_created_at timestamptz;
  found_state text;
  found_name text;
  found_username text;
begin
  if not public.is_moderator() then
    raise exception 'Moderator authorization required' using errcode = '42501';
  end if;

  case requested_target_type
    when 'post' then
      select p.author_id, concat_ws(' ', nullif(p.content, ''), case when p.media_url is not null then '[Attached media]' end), p.created_at, p.state::text
        into found_owner, found_preview, found_created_at, found_state from public.posts p where p.id = requested_target_id;
    when 'short' then
      select s.author_id, coalesce(nullif(s.caption, ''), '[Short video with no caption]'), s.created_at, s.state::text
        into found_owner, found_preview, found_created_at, found_state from public.short_videos s where s.id = requested_target_id;
    when 'event' then
      select e.creator_id, concat_ws(' — ', e.title, nullif(e.description, '')), e.starts_at, e.state::text
        into found_owner, found_preview, found_created_at, found_state from public.events e where e.id = requested_target_id;
    when 'comment' then
      select c.author_id, c.body, c.created_at, c.state::text
        into found_owner, found_preview, found_created_at, found_state from public.social_comments c where c.id = requested_target_id;
    when 'message' then
      select m.sender_id, m.body, m.sent_at, m.state::text
        into found_owner, found_preview, found_created_at, found_state from public.messages m where m.id = requested_target_id;
  end case;

  if found_owner is not null then
    select p.display_name, p.username into found_name, found_username
      from public.profiles p where p.id = found_owner;
  end if;

  return query select found_owner, found_name, found_username,
    coalesce(found_preview, 'Target unavailable or no longer accessible.'),
    found_created_at, coalesce(found_state, 'unavailable');
end;
$$;
revoke all on function public.get_moderation_report_context(public.report_target_type, uuid) from public, anon;
grant execute on function public.get_moderation_report_context(public.report_target_type, uuid) to authenticated;
