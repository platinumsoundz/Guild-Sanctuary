-- Add server-timestamped read receipts for one-to-one conversations.
-- Group conversations deliberately keep per-member read state out of this first version.
begin;

create or replace function public.mark_direct_messages_read(
  requested_conversation_id uuid,
  requested_world public.world_type
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  read_timestamp timestamptz := pg_catalog.now();
begin
  if caller_id is null or not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if requested_conversation_id is null or requested_world is null
     or not public.is_active_conversation_member(requested_conversation_id) then
    raise exception 'Conversation is unavailable' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.conversations c
    where c.id = requested_conversation_id
      and c.world_type = requested_world
      and c.kind = 'direct'
  ) then
    return null;
  end if;

  update public.messages m
  set read_at = read_timestamp
  where m.conversation_id = requested_conversation_id
    and m.sender_id <> caller_id
    and m.state = 'visible'
    and m.read_at is null;

  return read_timestamp;
end;
$$;

revoke all on function public.mark_direct_messages_read(uuid, public.world_type) from public, anon;
grant execute on function public.mark_direct_messages_read(uuid, public.world_type) to authenticated;

notify pgrst, 'reload schema';
commit;
