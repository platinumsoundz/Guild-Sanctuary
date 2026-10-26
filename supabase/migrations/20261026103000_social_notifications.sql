-- Persistent notifications for social likes and comments.
begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (notification_type in ('like', 'comment')),
  target_type text not null check (target_type in ('post', 'short', 'event')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_recipient_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.notify_social_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_owner uuid;
begin
  if new.target_type = 'post' then
    select p.author_id into target_owner
    from public.posts p where p.id = new.target_id and p.state = 'visible';
  elsif new.target_type = 'short' then
    select s.author_id into target_owner
    from public.short_videos s where s.id = new.target_id and s.state = 'visible';
  elsif new.target_type = 'event' then
    select e.creator_id into target_owner
    from public.events e where e.id = new.target_id and e.state = 'visible';
  else
    return new;
  end if;

  if target_owner is not null and target_owner <> new.user_id then
    insert into public.notifications (
      recipient_id, actor_id, notification_type, target_type, target_id
    ) values (
      target_owner, new.user_id, 'like', new.target_type::text, new.target_id
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_social_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_owner uuid;
begin
  if new.state <> 'visible' then
    return new;
  end if;

  if new.target_type = 'post' then
    select p.author_id into target_owner
    from public.posts p where p.id = new.target_id and p.state = 'visible';
  elsif new.target_type = 'short' then
    select s.author_id into target_owner
    from public.short_videos s where s.id = new.target_id and s.state = 'visible';
  elsif new.target_type = 'event' then
    select e.creator_id into target_owner
    from public.events e where e.id = new.target_id and e.state = 'visible';
  else
    return new;
  end if;

  if target_owner is not null and target_owner <> new.author_id then
    insert into public.notifications (
      recipient_id, actor_id, notification_type, target_type, target_id
    ) values (
      target_owner, new.author_id, 'comment', new.target_type::text, new.target_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists social_likes_create_notification on public.social_likes;
create trigger social_likes_create_notification
  after insert on public.social_likes
  for each row execute function public.notify_social_like();

drop trigger if exists social_comments_create_notification on public.social_comments;
create trigger social_comments_create_notification
  after insert on public.social_comments
  for each row execute function public.notify_social_comment();

revoke all on function public.notify_social_like() from public, anon, authenticated;
revoke all on function public.notify_social_comment() from public, anon, authenticated;

commit;
