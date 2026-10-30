-- Allow a member to remove only their own notifications.
-- The recipient predicate is enforced by RLS; clients cannot clear another
-- member's notifications or cross the Sanctuary/Guild account boundary.
alter table public.notifications enable row level security;

drop policy if exists notifications_recipient_delete_own on public.notifications;

create policy notifications_recipient_delete_own
  on public.notifications
  for delete
  to authenticated
  using (auth.uid() = recipient_id);

grant delete on table public.notifications to authenticated;
