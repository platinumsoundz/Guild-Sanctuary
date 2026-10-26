-- Restore missing moderation tables/functions and permit safe comment management.
-- This is additive: existing reports/actions/audit rows are preserved.
begin;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 2 and 80),
  details text check (details is null or char_length(details) <= 2000),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.content_reports(id) on delete set null,
  actor_id uuid not null references public.profiles(id),
  target_type text not null,
  target_id uuid not null,
  action public.moderation_action_type not null,
  rationale text not null check (char_length(rationale) between 3 and 1000),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.moderation_actions drop constraint if exists moderation_actions_target_type_check;
alter table public.moderation_actions add constraint moderation_actions_target_type_check
  check (target_type in ('post','short','event','message','comment','user'));

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists reports_queue_idx on public.content_reports (status, created_at) where status in ('open','reviewing');

alter table public.content_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "reporters create own reports" on public.content_reports;
create policy "reporters create own reports" on public.content_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
drop policy if exists "reporters and moderators view reports" on public.content_reports;
create policy "reporters and moderators view reports" on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());
drop policy if exists "moderators update reports" on public.content_reports;
create policy "moderators update reports" on public.content_reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
drop policy if exists "moderators view actions" on public.moderation_actions;
create policy "moderators view actions" on public.moderation_actions for select to authenticated using (public.is_moderator());
drop policy if exists "moderators view audit events" on public.audit_events;
create policy "moderators view audit events" on public.audit_events for select to authenticated using (public.is_moderator());

drop policy if exists "authors update own comments" on public.social_comments;
create policy "authors update own comments" on public.social_comments for update to authenticated
  using (author_id = (select auth.uid()) and public.is_active_user())
  with check (author_id = (select auth.uid()) and public.is_active_user());
drop policy if exists "visible short comments readable" on public.social_comments;
create policy "visible short comments readable" on public.social_comments for select to authenticated
  using (target_type = 'short'::public.report_target_type and state = 'visible'::public.content_state
    and exists (select 1 from public.short_videos s where s.id = target_id and s.state = 'visible'::public.content_state));

create or replace function public.submit_content_report(
  requested_target_type public.report_target_type,
  requested_target_id uuid,
  requested_reason text,
  requested_details text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare caller_id uuid := auth.uid(); target_exists boolean := false; report_id uuid;
begin
  if caller_id is null or not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if char_length(trim(requested_reason)) not between 2 and 80 or (requested_details is not null and char_length(requested_details) > 2000) then
    raise exception 'Invalid report details' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(caller_id::text || ':report-rate', 0));
  if (select count(*) from public.content_reports where reporter_id = caller_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Report rate limit exceeded' using errcode = '42900';
  end if;
  case requested_target_type
    when 'post' then select exists(select 1 from public.posts where id=requested_target_id and state='visible'::public.content_state) into target_exists;
    when 'short' then select exists(select 1 from public.short_videos where id=requested_target_id and state='visible'::public.content_state) into target_exists;
    when 'event' then select exists(select 1 from public.events where id=requested_target_id and state='visible'::public.content_state) into target_exists;
    when 'comment' then select exists(
      select 1 from public.social_comments c where c.id=requested_target_id and c.state='visible'::public.content_state
        and public.social_target_is_visible(c.target_type,c.target_id)
    ) into target_exists;
    when 'message' then
      if to_regclass('public.messages') is not null then
        execute 'select exists(select 1 from public.messages where id = $1)' into target_exists using requested_target_id;
      end if;
  end case;
  if not target_exists then raise exception 'Report target is unavailable' using errcode = 'P0002'; end if;
  insert into public.content_reports (reporter_id,target_type,target_id,reason,details)
  values (caller_id,requested_target_type,requested_target_id,trim(requested_reason),nullif(trim(requested_details),''))
  on conflict (reporter_id,target_type,target_id) do update
    set reason=excluded.reason, details=excluded.details, status='open', reviewed_by=null, reviewed_at=null
  returning id into report_id;
  return report_id;
end;
$$;

create or replace function public.get_report_target_owner(requested_target_type public.report_target_type, requested_target_id uuid)
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare owner_id uuid;
begin
  if not public.is_moderator() then raise exception 'Moderator authorization required' using errcode = '42501'; end if;
  case requested_target_type
    when 'post' then select author_id into owner_id from public.posts where id=requested_target_id;
    when 'short' then select author_id into owner_id from public.short_videos where id=requested_target_id;
    when 'event' then select creator_id into owner_id from public.events where id=requested_target_id;
    when 'comment' then select author_id into owner_id from public.social_comments where id=requested_target_id;
    when 'message' then
      if to_regclass('public.messages') is not null then
        execute 'select sender_id from public.messages where id = $1' into owner_id using requested_target_id;
      end if;
  end case;
  return owner_id;
end;
$$;

create or replace function public.apply_moderation_action(
  requested_report_id uuid,
  requested_target_type text,
  requested_target_id uuid,
  requested_action public.moderation_action_type,
  requested_rationale text,
  requested_expires_at timestamptz default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare caller_id uuid := auth.uid(); action_id uuid;
begin
  if caller_id is null or not public.is_moderator() then raise exception 'Moderator authorization required' using errcode = '42501'; end if;
  if char_length(trim(requested_rationale)) not between 3 and 1000 then raise exception 'A moderation rationale is required' using errcode = '22023'; end if;
  if requested_action in ('warn','suspend','ban') and requested_target_type <> 'user' then raise exception 'Account actions require a user target' using errcode = '22023'; end if;
  if requested_action not in ('warn','suspend','ban') and requested_target_type = 'user' then raise exception 'Content actions require a content target' using errcode = '22023'; end if;
  if requested_action = 'suspend' and (requested_expires_at is null or requested_expires_at <= now()) then raise exception 'Temporary suspensions require a future expiry' using errcode = '22023'; end if;
  if requested_target_type = 'user' and not exists(select 1 from public.profiles where id=requested_target_id) then raise exception 'Moderation target is unavailable' using errcode = 'P0002'; end if;
  if requested_target_type = 'post' and not exists(select 1 from public.posts where id=requested_target_id) then raise exception 'Moderation target is unavailable' using errcode = 'P0002'; end if;
  if requested_target_type = 'short' and not exists(select 1 from public.short_videos where id=requested_target_id) then raise exception 'Moderation target is unavailable' using errcode = 'P0002'; end if;
  if requested_target_type = 'event' and not exists(select 1 from public.events where id=requested_target_id) then raise exception 'Moderation target is unavailable' using errcode = 'P0002'; end if;
  if requested_target_type = 'comment' and not exists(select 1 from public.social_comments where id=requested_target_id) then raise exception 'Moderation target is unavailable' using errcode = 'P0002'; end if;
  if requested_target_type not in ('user','post','short','event','comment','message') then raise exception 'Unsupported moderation target' using errcode = '22023'; end if;
  if requested_report_id is not null and not exists (
    select 1 from public.content_reports r where r.id=requested_report_id and
      ((requested_target_type='user' and public.get_report_target_owner(r.target_type,r.target_id)=requested_target_id)
       or (requested_target_type=r.target_type::text and r.target_id=requested_target_id))
  ) then raise exception 'Report and moderation target do not match' using errcode = '22023'; end if;
  insert into public.moderation_actions(report_id,actor_id,target_type,target_id,action,rationale,expires_at)
  values(requested_report_id,caller_id,requested_target_type,requested_target_id,requested_action,trim(requested_rationale),requested_expires_at)
  returning id into action_id;
  if requested_action in ('suspend','ban') then
    update public.profiles set status=case when requested_action='suspend' then 'suspended' else 'banned' end,
      suspended_until=case when requested_action='suspend' then requested_expires_at else null end, updated_at=now()
      where id=requested_target_id;
  elsif requested_target_type='post' then
    update public.posts set state=case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end where id=requested_target_id;
  elsif requested_target_type='short' then
    update public.short_videos set state=case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end where id=requested_target_id;
  elsif requested_target_type='event' then
    update public.events set state=case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end where id=requested_target_id;
  elsif requested_target_type='comment' then
    update public.social_comments set state=case requested_action when 'restore' then 'visible'::public.content_state when 'hide' then 'hidden'::public.content_state else 'removed'::public.content_state end where id=requested_target_id;
  end if;
  if requested_report_id is not null then update public.content_reports set status='resolved',reviewed_by=caller_id,reviewed_at=now() where id=requested_report_id; end if;
  insert into public.audit_events(actor_id,event_type,subject_type,subject_id,details)
  values(caller_id,'moderation.'||requested_action::text,requested_target_type,requested_target_id,
    jsonb_build_object('actionId',action_id,'reportId',requested_report_id,'rationale',trim(requested_rationale)));
  return action_id;
end;
$$;

revoke all on function public.submit_content_report(public.report_target_type,uuid,text,text) from public,anon;
grant execute on function public.submit_content_report(public.report_target_type,uuid,text,text) to authenticated;
revoke all on function public.get_report_target_owner(public.report_target_type,uuid) from public,anon;
grant execute on function public.get_report_target_owner(public.report_target_type,uuid) to authenticated;
revoke all on function public.apply_moderation_action(uuid,text,uuid,public.moderation_action_type,text,timestamptz) from public,anon;
grant execute on function public.apply_moderation_action(uuid,text,uuid,public.moderation_action_type,text,timestamptz) to authenticated;
grant select on public.content_reports, public.moderation_actions, public.audit_events to authenticated;

commit;