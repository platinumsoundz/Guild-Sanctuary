-- Restore the original Sanctuary/Guild community boundary on the shared schema.
-- Existing content remains in Sanctuary; new Guild content is explicitly tagged guild.
begin;

alter table public.posts alter column world_type set default 'sanctuary'::public.world_type;
alter table public.short_videos alter column world_type set default 'sanctuary'::public.world_type;
alter table public.events alter column world_type set default 'sanctuary'::public.world_type;
alter table public.conversations alter column world_type set default 'sanctuary'::public.world_type;
alter table public.direct_conversation_pairs alter column world_type set default 'sanctuary'::public.world_type;

-- Notifications and reports follow the environment of the content they reference.
alter table public.notifications
  add column if not exists world_type public.world_type not null default 'sanctuary'::public.world_type;
alter table public.content_reports
  add column if not exists world_type public.world_type not null default 'sanctuary'::public.world_type;

update public.notifications n set world_type = p.world_type
from public.posts p where n.target_type = 'post' and n.target_id = p.id;
update public.notifications n set world_type = s.world_type
from public.short_videos s where n.target_type = 'short' and n.target_id = s.id;
update public.notifications n set world_type = e.world_type
from public.events e where n.target_type = 'event' and n.target_id = e.id;

update public.content_reports r set world_type = p.world_type
from public.posts p where r.target_type = 'post' and r.target_id = p.id;
update public.content_reports r set world_type = s.world_type
from public.short_videos s where r.target_type = 'short' and r.target_id = s.id;
update public.content_reports r set world_type = e.world_type
from public.events e where r.target_type = 'event' and r.target_id = e.id;
update public.content_reports r set world_type = c.world_type
from public.social_comments comment
join public.posts c on comment.target_type = 'post' and comment.target_id = c.id
where r.target_type = 'comment' and r.target_id = comment.id;
update public.content_reports r set world_type = c.world_type
from public.social_comments comment
join public.short_videos c on comment.target_type = 'short' and comment.target_id = c.id
where r.target_type = 'comment' and r.target_id = comment.id;
update public.content_reports r set world_type = c.world_type
from public.social_comments comment
join public.events c on comment.target_type = 'event' and comment.target_id = c.id
where r.target_type = 'comment' and r.target_id = comment.id;
update public.content_reports r set world_type = conv.world_type
from public.messages m join public.conversations conv on conv.id = m.conversation_id
where r.target_type = 'message' and r.target_id = m.id;

create index if not exists notifications_recipient_world_created_idx
  on public.notifications (recipient_id, world_type, created_at desc);
create index if not exists content_reports_world_status_created_idx
  on public.content_reports (world_type, status, created_at asc);

create or replace function public.sync_content_report_world_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  resolved_world public.world_type;
begin
  if new.target_type = 'post' then
    select world_type into resolved_world from public.posts where id = new.target_id;
  elsif new.target_type = 'short' then
    select world_type into resolved_world from public.short_videos where id = new.target_id;
  elsif new.target_type = 'event' then
    select world_type into resolved_world from public.events where id = new.target_id;
  elsif new.target_type = 'comment' then
    select case c.target_type
      when 'post' then (select p.world_type from public.posts p where p.id = c.target_id)
      when 'short' then (select s.world_type from public.short_videos s where s.id = c.target_id)
      when 'event' then (select e.world_type from public.events e where e.id = c.target_id)
      else null
    end into resolved_world
    from public.social_comments c where c.id = new.target_id;
  elsif new.target_type = 'message' then
    select conv.world_type into resolved_world
    from public.messages m join public.conversations conv on conv.id = m.conversation_id
    where m.id = new.target_id;
  end if;

  if resolved_world is null then
    raise exception 'Report target is unavailable' using errcode = 'P0002';
  end if;
  new.world_type := resolved_world;
  return new;
end;
$function$;

drop trigger if exists content_reports_sync_world_type on public.content_reports;
create trigger content_reports_sync_world_type
before insert or update of target_type, target_id, world_type on public.content_reports
for each row execute function public.sync_content_report_world_type();

create or replace function public.notify_social_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_owner uuid;
  target_world public.world_type;
begin
  if new.target_type = 'post' then
    select p.author_id, p.world_type into target_owner, target_world
    from public.posts p where p.id = new.target_id and p.state = 'visible';
  elsif new.target_type = 'short' then
    select s.author_id, s.world_type into target_owner, target_world
    from public.short_videos s where s.id = new.target_id and s.state = 'visible';
  elsif new.target_type = 'event' then
    select e.creator_id, e.world_type into target_owner, target_world
    from public.events e where e.id = new.target_id and e.state = 'visible';
  else
    return new;
  end if;

  if target_owner is not null and target_owner <> new.user_id then
    insert into public.notifications (
      recipient_id, actor_id, notification_type, target_type, target_id, world_type
    ) values (
      target_owner, new.user_id, 'like', new.target_type::text, new.target_id, target_world
    );
  end if;
  return new;
end;
$function$;

create or replace function public.notify_social_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_owner uuid;
  target_world public.world_type;
begin
  if new.state <> 'visible' then
    return new;
  end if;

  if new.target_type = 'post' then
    select p.author_id, p.world_type into target_owner, target_world
    from public.posts p where p.id = new.target_id and p.state = 'visible';
  elsif new.target_type = 'short' then
    select s.author_id, s.world_type into target_owner, target_world
    from public.short_videos s where s.id = new.target_id and s.state = 'visible';
  elsif new.target_type = 'event' then
    select e.creator_id, e.world_type into target_owner, target_world
    from public.events e where e.id = new.target_id and e.state = 'visible';
  else
    return new;
  end if;

  if target_owner is not null and target_owner <> new.author_id then
    insert into public.notifications (
      recipient_id, actor_id, notification_type, target_type, target_id, world_type
    ) values (
      target_owner, new.author_id, 'comment', new.target_type::text, new.target_id, target_world
    );
  end if;
  return new;
end;
$function$;

create or replace function public.create_scoped_conversation(
  requested_kind public.conversation_kind,
  requested_world public.world_type,
  requested_member_ids uuid[],
  requested_name text default null
)
returns uuid
language sql
security definer
set search_path = ''
as $function$
  select public.create_conversation(
    requested_kind,
    requested_world,
    requested_member_ids,
    requested_name
  );
$function$;

revoke all on function public.create_scoped_conversation(public.conversation_kind, public.world_type, uuid[], text) from public, anon;
grant execute on function public.create_scoped_conversation(public.conversation_kind, public.world_type, uuid[], text) to authenticated;

commit;
notify pgrst, 'reload schema';
