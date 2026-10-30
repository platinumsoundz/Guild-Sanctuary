-- Add per-role page visibility while preserving existing global ("all") settings.
begin;

-- Keep the RPC's server-side role check aligned with the platform role hierarchy.
-- The earlier helper only recognised moderator/admin, which blocked Developer/Owner
-- accounts even though the Moderation page and hierarchy trigger explicitly allow them.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('moderator', 'admin', 'developer', 'owner')
      and status = 'active'
  );
$;

alter table public.platform_page_visibility
  add column if not exists role_key text not null default 'all';

alter table public.platform_page_visibility
  drop constraint if exists platform_page_visibility_role_key_check;
alter table public.platform_page_visibility
  add constraint platform_page_visibility_role_key_check
  check (role_key in ('all', 'guest', 'user', 'vip', 'moderator', 'admin', 'developer', 'owner'));

alter table public.platform_page_visibility
  drop constraint if exists platform_page_visibility_pkey;
alter table public.platform_page_visibility
  add constraint platform_page_visibility_pkey primary key (page_key, role_key);

-- Comment reports were represented in the client but were not handled by the
-- original report-submission and ownership RPCs.
create or replace function public.submit_content_report(
  requested_target_type public.report_target_type,
  requested_target_id uuid,
  requested_reason text,
  requested_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_exists boolean := false;
  report_id uuid;
begin
  if caller_id is null or not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if requested_target_id is null
     or requested_reason is null
     or char_length(trim(requested_reason)) not between 2 and 80
     or (requested_details is not null and char_length(requested_details) > 2000) then
    raise exception 'Invalid report details' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text || ':report-rate', 0));
  if (select count(*) from public.content_reports
      where reporter_id = caller_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Report rate limit exceeded' using errcode = '42900';
  end if;

  case requested_target_type
    when 'post' then
      select exists(select 1 from public.posts where id = requested_target_id and state = 'visible'::public.content_state)
        into target_exists;
    when 'short' then
      select exists(select 1 from public.short_videos where id = requested_target_id and state = 'visible'::public.content_state)
        into target_exists;
    when 'event' then
      select exists(select 1 from public.events where id = requested_target_id and state = 'visible'::public.content_state)
        into target_exists;
    when 'comment' then
      select exists(
        select 1 from public.social_comments c
        where c.id = requested_target_id
          and c.state = 'visible'::public.content_state
          and public.social_target_is_visible(c.target_type, c.target_id)
      ) into target_exists;
    when 'message' then
      -- Dynamic SQL keeps this migration compatible with deployments where the
      -- messaging schema is not installed yet. Missing schema/helper fails closed.
      if to_regclass('public.messages') is not null
         and to_regprocedure('public.is_active_conversation_member(uuid)') is not null then
        execute 'select exists (
          select 1 from public.messages m
          where m.id = $1
            and m.state = ''visible''::public.content_state
            and public.is_active_conversation_member(m.conversation_id)
        )' into target_exists using requested_target_id;
      end if;
  end case;

  if not target_exists then
    raise exception 'Report target is unavailable or you are not authorized to report it' using errcode = 'P0002';
  end if;

  insert into public.content_reports (reporter_id, target_type, target_id, reason, details)
  values (caller_id, requested_target_type, requested_target_id, trim(requested_reason), nullif(trim(requested_details), ''))
  on conflict (reporter_id, target_type, target_id) do update
    set reason = excluded.reason,
        details = excluded.details,
        status = 'open',
        reviewed_by = null,
        reviewed_at = null
  returning id into report_id;

  return report_id;
end;
$$;

revoke all on function public.submit_content_report(public.report_target_type, uuid, text, text) from public;
grant execute on function public.submit_content_report(public.report_target_type, uuid, text, text) to authenticated;

create or replace function public.get_report_target_owner(requested_target_type public.report_target_type, requested_target_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $
declare
  owner_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Moderator authorization required' using errcode = '42501';
  end if;
  case requested_target_type
    when 'post' then select author_id into owner_id from public.posts where id = requested_target_id;
    when 'short' then select author_id into owner_id from public.short_videos where id = requested_target_id;
    when 'event' then select creator_id into owner_id from public.events where id = requested_target_id;
    when 'message' then select sender_id into owner_id from public.messages where id = requested_target_id;
    when 'comment' then select author_id into owner_id from public.social_comments where id = requested_target_id;
  end case;
  return owner_id;
end;
$;

revoke all on function public.get_report_target_owner(public.report_target_type, uuid) from public;
grant execute on function public.get_report_target_owner(public.report_target_type, uuid) to authenticated;

-- Ensure the moderation audit table accepts comment targets on databases where
-- the original target-type constraint predates comment reporting.
alter table public.moderation_actions
  drop constraint if exists moderation_actions_target_type_check;
alter table public.moderation_actions
  add constraint moderation_actions_target_type_check
  check (target_type in ('post', 'short', 'event', 'message', 'comment', 'user'));

create or replace function public.apply_moderation_action(
  requested_report_id uuid,
  requested_target_type text,
  requested_target_id uuid,
  requested_action public.moderation_action_type,
  requested_rationale text,
  requested_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  action_id uuid;
begin
  if caller_id is null or not public.is_moderator() then
    raise exception 'Moderator authorization required' using errcode = '42501';
  end if;
  if char_length(trim(requested_rationale)) not between 3 and 1000 then
    raise exception 'A moderation rationale is required' using errcode = '22023';
  end if;
  if requested_action in ('warn', 'suspend', 'ban') and requested_target_type <> 'user' then
    raise exception 'Account actions require a user target' using errcode = '22023';
  end if;
  if requested_action not in ('warn', 'suspend', 'ban') and requested_target_type = 'user' then
    raise exception 'Content actions require a content target' using errcode = '22023';
  end if;
  if requested_action = 'suspend' and (requested_expires_at is null or requested_expires_at <= now()) then
    raise exception 'Temporary suspensions require a future expiry' using errcode = '22023';
  end if;

  if requested_target_type = 'user' then
    if not exists (select 1 from public.profiles where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  elsif requested_target_type = 'post' then
    if not exists (select 1 from public.posts where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  elsif requested_target_type = 'short' then
    if not exists (select 1 from public.short_videos where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  elsif requested_target_type = 'event' then
    if not exists (select 1 from public.events where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  elsif requested_target_type = 'message' then
    if not exists (select 1 from public.messages where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  elsif requested_target_type = 'comment' then
    if not exists (select 1 from public.social_comments where id = requested_target_id) then
      raise exception 'Moderation target is unavailable' using errcode = 'P0002';
    end if;
  else
    raise exception 'Unsupported moderation target type' using errcode = '22023';
  end if;

  if requested_report_id is not null and not exists (
    select 1
    from public.content_reports report
    where report.id = requested_report_id
      and (
        (requested_target_type = 'user' and public.get_report_target_owner(report.target_type, report.target_id) = requested_target_id)
        or (requested_target_type = report.target_type::text and report.target_id = requested_target_id)
      )
  ) then
    raise exception 'Report and moderation target do not match' using errcode = '22023';
  end if;

  insert into public.moderation_actions (report_id, actor_id, target_type, target_id, action, rationale, expires_at)
  values (requested_report_id, caller_id, requested_target_type, requested_target_id, requested_action, trim(requested_rationale), requested_expires_at)
  returning id into action_id;

  if requested_action in ('suspend', 'ban') then
    update public.profiles
      set status = case when requested_action = 'suspend' then 'suspended' else 'banned' end,
          suspended_until = case when requested_action = 'suspend' then requested_expires_at else null end,
          updated_at = now()
      where id = requested_target_id;
  elsif requested_target_type = 'post' then
    update public.posts
      set state = case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end
      where id = requested_target_id;
  elsif requested_target_type = 'short' then
    update public.short_videos
      set state = case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end
      where id = requested_target_id;
  elsif requested_target_type = 'event' then
    update public.events
      set state = case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end
      where id = requested_target_id;
  elsif requested_target_type = 'message' then
    update public.messages
      set state = case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end
      where id = requested_target_id;
  elsif requested_target_type = 'comment' then
    update public.social_comments
      set state = case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end
      where id = requested_target_id;
  end if;

  if requested_report_id is not null then
    update public.content_reports set status = 'resolved', reviewed_by = caller_id, reviewed_at = now()
      where id = requested_report_id;
  end if;

  insert into public.audit_events (actor_id, event_type, subject_type, subject_id, details)
  values (
    caller_id,
    'moderation.' || requested_action::text,
    requested_target_type,
    requested_target_id,
    jsonb_build_object('actionId', action_id, 'reportId', requested_report_id, 'rationale', trim(requested_rationale))
  );
  return action_id;
end;
$$;

revoke all on function public.apply_moderation_action(uuid, text, uuid, public.moderation_action_type, text, timestamptz) from public;
grant execute on function public.apply_moderation_action(uuid, text, uuid, public.moderation_action_type, text, timestamptz) to authenticated;

commit;
notify pgrst, 'reload schema';
