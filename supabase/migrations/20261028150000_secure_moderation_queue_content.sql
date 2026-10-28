-- Secure, role-gated read path for the moderation queue.
-- Moderators need to see the actual reported body even when normal feed RLS hides it.
-- This RPC is read-only and intentionally does not change migration history or live data.

create or replace function public.get_moderation_queue()
returns table (
  report_id uuid,
  reporter_id uuid,
  target_type public.report_target_type,
  target_id uuid,
  reason text,
  details text,
  report_status public.report_status,
  reviewed_by uuid,
  reviewed_at timestamptz,
  reported_at timestamptz,
  target_owner_id uuid,
  target_owner_username text,
  target_owner_display_name text,
  target_content text,
  target_title text,
  target_media_url text,
  target_state text,
  target_created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_role text;
  caller_status text;
  report_row record;
begin
  if caller_id is null then
    raise exception 'Sign in is required to view moderation reports.' using errcode = '42501';
  end if;

  select p.role, p.status into caller_role, caller_status
  from public.profiles p
  where p.id = caller_id;

  if caller_status is distinct from 'active'
    or caller_role not in ('moderator', 'admin', 'developer', 'owner') then
    raise exception 'Active moderator authorization required.' using errcode = '42501';
  end if;

  for report_row in
    select cr.*
    from public.content_reports cr
    where cr.status in ('open'::public.report_status, 'reviewing'::public.report_status)
    order by cr.created_at asc
    limit 100
  loop
    target_owner_id := null;
    target_owner_username := null;
    target_owner_display_name := null;
    target_content := null;
    target_title := null;
    target_media_url := null;
    target_state := null;
    target_created_at := null;

    case report_row.target_type
      when 'post' then
        select p.author_id, p.content, null::text, p.media_url, p.state::text, p.created_at
        into target_owner_id, target_content, target_title, target_media_url, target_state, target_created_at
        from public.posts p where p.id = report_row.target_id;
      when 'short' then
        select s.author_id, s.caption, null::text, s.video_url, s.state::text, s.created_at
        into target_owner_id, target_content, target_title, target_media_url, target_state, target_created_at
        from public.short_videos s where s.id = report_row.target_id;
      when 'event' then
        select e.creator_id, e.description, e.title, null::text, e.state::text, e.created_at
        into target_owner_id, target_content, target_title, target_media_url, target_state, target_created_at
        from public.events e where e.id = report_row.target_id;
      when 'comment' then
        select c.author_id, c.body, null::text, null::text, c.state::text, c.created_at
        into target_owner_id, target_content, target_title, target_media_url, target_state, target_created_at
        from public.social_comments c where c.id = report_row.target_id;
      when 'message' then
        if to_regclass('public.messages') is not null then
          execute 'select m.sender_id, m.body, null::text, null::text, m.state::text, m.sent_at from public.messages m where m.id = $1'
            into target_owner_id, target_content, target_title, target_media_url, target_state, target_created_at
            using report_row.target_id;
        end if;
    end case;

    if target_owner_id is not null then
      select p.username, p.display_name
      into target_owner_username, target_owner_display_name
      from public.profiles p
      where p.id = target_owner_id;
    end if;

    report_id := report_row.id;
    reporter_id := report_row.reporter_id;
    target_type := report_row.target_type;
    target_id := report_row.target_id;
    reason := report_row.reason;
    details := report_row.details;
    report_status := report_row.status;
    reviewed_by := report_row.reviewed_by;
    reviewed_at := report_row.reviewed_at;
    reported_at := report_row.created_at;
    return next;
  end loop;
end;
$$;

revoke all on function public.get_moderation_queue() from public, anon;
grant execute on function public.get_moderation_queue() to authenticated;
