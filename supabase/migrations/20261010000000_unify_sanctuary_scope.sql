-- Consolidate all previously world-scoped data into The Sanctuary.
-- Legacy columns remain temporarily for forward-compatible rollback, but application
-- writes no longer supply or filter on them.

alter table public.posts alter column world_type set default 'sanctuary'::public.world_type;
alter table public.short_videos alter column world_type set default 'sanctuary'::public.world_type;
alter table public.events alter column world_type set default 'sanctuary'::public.world_type;
alter table public.conversations alter column world_type set default 'sanctuary'::public.world_type;
alter table public.direct_conversation_pairs alter column world_type set default 'sanctuary'::public.world_type;

update public.posts set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;
update public.short_videos set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;
update public.events set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;
update public.conversations set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;
update public.direct_conversation_pairs set world_type = 'sanctuary'::public.world_type where world_type <> 'sanctuary'::public.world_type;

-- New application-facing RPC with no world argument. The historical RPC is
-- retained so the migration is forward-safe for clients not yet upgraded.
create function public.create_sanctuary_conversation(
  requested_kind public.conversation_kind,
  requested_member_ids uuid[],
  requested_name text default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.create_conversation(
    requested_kind,
    'sanctuary'::public.world_type,
    requested_member_ids,
    requested_name
  );
$$;

revoke all on function public.create_sanctuary_conversation(public.conversation_kind, uuid[], text) from public;
grant execute on function public.create_sanctuary_conversation(public.conversation_kind, uuid[], text) to authenticated;
