-- Staging/release gate: restrict wallet visibility and persist moderation outcomes.
-- Spending remains disabled by the existing lock migration.
create or replace function public.is_wallet_eligible()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and p.role in ('vip','moderator','admin','developer','owner')
  );
$$;
revoke all on function public.is_wallet_eligible() from public, anon;
grant execute on function public.is_wallet_eligible() to authenticated;

drop policy if exists "users read own token wallet" on public.token_wallets;
create policy "eligible members read own token wallet"
on public.token_wallets for select to authenticated
using (user_id = (select auth.uid()) and public.is_wallet_eligible());

drop policy if exists "users read own token ledger" on public.token_ledger;
create policy "eligible members read own token ledger"
on public.token_ledger for select to authenticated
using (user_id = (select auth.uid()) and public.is_wallet_eligible());

drop policy if exists "authenticated users read enabled token spend catalog" on public.token_spend_catalog;
create policy "eligible members read enabled token spend catalog"
on public.token_spend_catalog for select to authenticated
using (enabled and public.is_wallet_eligible());

drop policy if exists "users read own token spend ledger" on public.token_spend_ledger;
create policy "eligible members read own token spend ledger"
on public.token_spend_ledger for select to authenticated
using (user_id = (select auth.uid()) and public.is_wallet_eligible());

drop policy if exists "users read own token entitlements" on public.token_entitlements;
create policy "eligible members read own token entitlements"
on public.token_entitlements for select to authenticated
using (user_id = (select auth.uid()) and public.is_wallet_eligible());

create table if not exists public.moderation_user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('warn','hide','remove','restore','suspend','ban','report_update')),
  target_type text not null,
  target_id uuid,
  rationale text not null default '',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists moderation_user_notifications_recipient_created_idx
on public.moderation_user_notifications(recipient_id, created_at desc);
alter table public.moderation_user_notifications enable row level security;
revoke all on table public.moderation_user_notifications from public, anon, authenticated;
grant select on table public.moderation_user_notifications to authenticated;
grant update (read_at) on table public.moderation_user_notifications to authenticated;
drop policy if exists "members read own moderation notifications" on public.moderation_user_notifications;
create policy "members read own moderation notifications"
on public.moderation_user_notifications for select to authenticated
using (recipient_id = (select auth.uid()));
drop policy if exists "members mark own moderation notifications read" on public.moderation_user_notifications;
create policy "members mark own moderation notifications read"
on public.moderation_user_notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create or replace function public.notify_moderation_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  report_row public.content_reports%rowtype;
begin
  if new.target_type = 'user' then
    recipient := new.target_id;
  elsif new.target_type = 'post' then
    select author_id into recipient from public.posts where id = new.target_id;
  elsif new.target_type = 'short' then
    select author_id into recipient from public.short_videos where id = new.target_id;
  elsif new.target_type = 'event' then
    select creator_id into recipient from public.events where id = new.target_id;
  elsif new.target_type = 'comment' then
    select author_id into recipient from public.social_comments where id = new.target_id;
  elsif new.target_type = 'message' then
    select sender_id into recipient from public.messages where id = new.target_id;
  end if;

  if recipient is not null and recipient <> new.actor_id then
    insert into public.moderation_user_notifications
      (recipient_id, actor_id, event_type, target_type, target_id, rationale, expires_at)
    values (recipient, new.actor_id, new.action::text, new.target_type, new.target_id, new.rationale, new.expires_at);
  end if;

  if new.report_id is not null then
    select * into report_row from public.content_reports where id = new.report_id;
    if report_row.reporter_id is not null and report_row.reporter_id <> recipient then
      insert into public.moderation_user_notifications
        (recipient_id, actor_id, event_type, target_type, target_id, rationale, expires_at)
      values (report_row.reporter_id, new.actor_id, 'report_update', report_row.target_type::text,
        report_row.target_id, 'Your report has been reviewed by the moderation team.', null);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists moderation_action_notify_users on public.moderation_actions;
create trigger moderation_action_notify_users
after insert on public.moderation_actions
for each row execute function public.notify_moderation_action();
revoke all on function public.notify_moderation_action() from public, anon, authenticated;
