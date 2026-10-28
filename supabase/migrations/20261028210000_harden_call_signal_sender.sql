-- Require private channels and bind each call signal's claimed sender to auth.uid().
-- This prevents active conversation members from spoofing another participant's signalling identity.
begin;

drop policy if exists "Conversation members can receive call signals" on realtime.messages;
create policy "Conversation members can receive call signals"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and realtime.messages.private is true
  and split_part((select realtime.topic()), ':', 1) = 'sanctuary-call'
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id::text = split_part((select realtime.topic()), ':', 2)
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
      and public.is_active_user()
  )
);

drop policy if exists "Conversation members can send call signals" on realtime.messages;
create policy "Conversation members can send call signals"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and realtime.messages.private is true
  and realtime.messages.payload ->> 'from' = (select auth.uid())::text
  and split_part((select realtime.topic()), ':', 1) = 'sanctuary-call'
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id::text = split_part((select realtime.topic()), ':', 2)
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
      and public.is_active_user()
  )
);

commit;