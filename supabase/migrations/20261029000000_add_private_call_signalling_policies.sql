-- Private Supabase Realtime topics for one-to-one WebRTC signalling.
-- Only active members of the conversation encoded in the topic may read/write.
-- Payloads are ephemeral broadcasts; do not persist SDP or ICE in application tables.
begin;

drop policy if exists "sanctuary call members receive signalling" on realtime.messages;
create policy "sanctuary call members receive signalling"
on realtime.messages
for select
to authenticated
using (
  realtime.topic() ~ '^sanctuary-call:[0-9a-fA-F-]{36}$'
  and case
    when realtime.topic() ~ '^sanctuary-call:[0-9a-fA-F-]{36}$'
    then public.is_active_conversation_member(split_part(realtime.topic(), ':', 2)::uuid)
      and exists (select 1 from public.conversations c where c.id = split_part(realtime.topic(), ':', 2)::uuid and c.kind = 'direct')
    else false
  end
);

drop policy if exists "sanctuary call members send signalling" on realtime.messages;
create policy "sanctuary call members send signalling"
on realtime.messages
for insert
to authenticated
with check (
  realtime.topic() ~ '^sanctuary-call:[0-9a-fA-F-]{36}$'
  and case
    when realtime.topic() ~ '^sanctuary-call:[0-9a-fA-F-]{36}$'
    then public.is_active_conversation_member(split_part(realtime.topic(), ':', 2)::uuid)
    else false
  end
);

commit;
