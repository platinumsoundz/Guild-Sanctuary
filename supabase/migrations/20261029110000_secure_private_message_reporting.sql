-- Restrict private-message reports to active members of the conversation.
-- The prior SECURITY DEFINER RPC only checked whether a message UUID existed,
-- allowing unrelated signed-in users to submit reports against guessed/leaked IDs.
begin;

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

revoke all on function public.submit_content_report(public.report_target_type, uuid, text, text) from public, anon;
grant execute on function public.submit_content_report(public.report_target_type, uuid, text, text) to authenticated;

commit;
notify pgrst, 'reload schema';
