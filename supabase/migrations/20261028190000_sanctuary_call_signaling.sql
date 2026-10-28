-- Private Supabase Realtime channels for one-to-one call signalling.
-- Payloads contain ephemeral WebRTC negotiation data only; no call media is stored.
-- Access is granted only to current members of the conversation encoded in the topic.
begin;

drop policy if exists "Conversation members can receive call signals" on realtime.messages;
create policy "Conversation members can receive call signals"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and split_part(realtime.topic(), ':', 1) = 'sanctuary-call'
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id::text = split_part(realtime.topic(), ':', 2)
      and cm.user_id = auth.uid()
      and cm.left_at is null
  )
);

drop policy if exists "Conversation members can send call signals" on realtime.messages;
create policy "Conversation members can send call signals"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and split_part(realtime.topic(), ':', 1) = 'sanctuary-call'
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id::text = split_part(realtime.topic(), ':', 2)
      and cm.user_id = auth.uid()
      and cm.left_at is null
  )
);

commit;
