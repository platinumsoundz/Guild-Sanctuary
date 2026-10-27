-- Phase 1: enforce self-action and role-hierarchy guards in account moderation.
-- Replaces only apply_moderation_action; no rows are changed by this migration itself.
-- Apply to a disposable/staging database only after migration-history reconciliation.
begin;

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
declare
  caller_id uuid := auth.uid();
  action_id uuid;
  caller_role text;
  target_role text;
  caller_rank integer;
  target_rank integer;
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
  -- Account actions must respect the same strict role hierarchy as role management.
  -- Lock both profiles in stable UUID order to avoid races with concurrent role changes.
  if requested_target_type = 'user' then
    perform p.id
    from public.profiles p
    where p.id in (caller_id, requested_target_id)
    order by p.id
    for update;

    select p.role into caller_role
    from public.profiles p
    where p.id = caller_id and p.status = 'active';

    select p.role into target_role
    from public.profiles p
    where p.id = requested_target_id;

    if caller_role is null or target_role is null then
      raise exception 'The account action target is unavailable.' using errcode = 'P0002';
    end if;
    if requested_target_id = caller_id then
      raise exception 'You cannot moderate your own account.' using errcode = '42501';
    end if;

    caller_rank := case caller_role
      when 'owner' then 6 when 'developer' then 5 when 'admin' then 4
      when 'moderator' then 3 when 'vip' then 2 when 'user' then 1 else 0 end;
    target_rank := case target_role
      when 'owner' then 6 when 'developer' then 5 when 'admin' then 4
      when 'moderator' then 3 when 'vip' then 2 when 'user' then 1 else 0 end;

    if caller_rank = 0 or target_rank = 0 or caller_rank <= target_rank then
      raise exception 'You may only take account actions against members with a lower role.' using errcode = '42501';
    end if;
  end if;

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

revoke all on function public.apply_moderation_action(uuid, text, uuid, public.moderation_action_type, text, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_moderation_action(uuid, text, uuid, public.moderation_action_type, text, timestamptz) to authenticated;

commit;
