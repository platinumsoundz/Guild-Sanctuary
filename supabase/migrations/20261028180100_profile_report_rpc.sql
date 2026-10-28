-- Extend existing moderation RPCs to safely accept member-profile reports.
begin;

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
  if requested_target_type = 'user' and requested_target_id = caller_id then
    raise exception 'You cannot report your own profile' using errcode = '22023';
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
    when 'user' then select exists(select 1 from public.profiles where id=requested_target_id and id <> caller_id) into target_exists;
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
    when 'user' then select id into owner_id from public.profiles where id=requested_target_id;
  end case;
  return owner_id;
end;
$$;

commit;
