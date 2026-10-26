-- Phase 1 admin and moderation dashboard.
-- Adds member appeals, internal notes, member search/overview, role management,
-- audit-log browsing, and refund/dispute review RPCs.
--
-- Depends on:
--   * public.profiles (moderation foundation)
--   * public.log_audit_event(...) (20261026000000_token_purchase_age_gate.sql)
--   * public.token_purchase_reviews (20261026000100_token_refund_clawback.sql)
--
-- Role checks are inline in a small helper rather than the older
-- public.is_moderator(), because that helper is missing on some partially
-- migrated projects.
begin;

create or replace function public.current_moderation_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.role in ('moderator', 'admin')
    and (p.status = 'active' or (p.status = 'suspended' and p.suspended_until <= now()));
$$;

revoke all on function public.current_moderation_role() from public, anon, authenticated;
-- RLS policies evaluate as the querying user, so they must be allowed to call
-- this security-definer helper. It only reveals the caller's own role.
grant execute on function public.current_moderation_role() to authenticated;

create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid,
  action_id uuid,
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'denied')),
  resolution_notes text check (resolution_notes is null or char_length(resolution_notes) between 3 and 2000),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists moderation_appeals_status_created_idx
  on public.moderation_appeals (status, created_at);
create index if not exists moderation_appeals_user_created_idx
  on public.moderation_appeals (user_id, created_at desc);
-- One live appeal per member keeps the queue readable; a denied member can
-- submit again after the decision.
create unique index if not exists moderation_appeals_one_open_per_user_idx
  on public.moderation_appeals (user_id)
  where status in ('open', 'reviewing');

create table if not exists public.moderation_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  subject_user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists moderation_notes_subject_created_idx
  on public.moderation_notes (subject_user_id, created_at desc);

alter table public.moderation_appeals enable row level security;
alter table public.moderation_notes enable row level security;

create policy "members read own appeals"
  on public.moderation_appeals for select to authenticated
  using (user_id = (select auth.uid()));

create policy "moderators read all appeals"
  on public.moderation_appeals for select to authenticated
  using (public.current_moderation_role() is not null);

create policy "moderators read member notes"
  on public.moderation_notes for select to authenticated
  using (public.current_moderation_role() is not null);

grant select on public.moderation_appeals to authenticated;
grant select on public.moderation_notes to authenticated;
revoke insert, update, delete, truncate
  on public.moderation_appeals, public.moderation_notes
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.moderation_appeals, public.moderation_notes
  to service_role;

create or replace function public.submit_moderation_appeal(
  requested_report_id uuid,
  requested_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  normalized_message text := trim(coalesce(requested_message, ''));
  new_id uuid;
begin
  if caller_id is null then
    raise exception 'Sign in before submitting an appeal.' using errcode = '42501';
  end if;

  if not public.is_active_user() then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  if char_length(normalized_message) < 10 or char_length(normalized_message) > 2000 then
    raise exception 'Explain your appeal in 10 to 2,000 characters.' using errcode = '22023';
  end if;

  if requested_report_id is not null then
    if not exists (
      select 1 from public.content_reports r
      where r.id = requested_report_id
        and r.reporter_id = caller_id
    ) and not exists (
      select 1 from public.moderation_actions a
      where a.report_id = requested_report_id
        and a.target_type = 'user'
        and a.target_id = caller_id
    ) then
      raise exception 'You can only appeal a decision that involves your account.' using errcode = '42501';
    end if;
  end if;

  insert into public.moderation_appeals (user_id, report_id, message)
  values (caller_id, requested_report_id, normalized_message)
  returning id into new_id;

  perform public.log_audit_event(
    caller_id,
    'moderation.appeal_submitted',
    'user',
    caller_id,
    jsonb_build_object('appealId', new_id, 'reportId', requested_report_id)
  );

  return new_id;
end;
$$;

revoke all on function public.submit_moderation_appeal(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_moderation_appeal(uuid, text) to authenticated;

create or replace function public.fetch_my_moderation_appeals()
returns table (
  id uuid,
  user_id uuid,
  report_id uuid,
  action_id uuid,
  message text,
  status text,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.user_id, a.report_id, a.action_id, a.message, a.status,
         a.resolution_notes, a.resolved_by, a.resolved_at, a.created_at
  from public.moderation_appeals a
  where a.user_id = (select auth.uid())
  order by a.created_at desc;
$$;

revoke all on function public.fetch_my_moderation_appeals() from public, anon, authenticated;
grant execute on function public.fetch_my_moderation_appeals() to authenticated;

create or replace function public.admin_list_appeals(requested_status text default 'open')
returns table (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  report_id uuid,
  action_id uuid,
  message text,
  status text,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.current_moderation_role() is null then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;

  if requested_status is not null
    and requested_status not in ('open', 'reviewing', 'resolved', 'denied')
  then
    raise exception 'Unknown appeal status.' using errcode = '22023';
  end if;

  return query
  select a.id, a.user_id, p.username, p.display_name, a.report_id, a.action_id,
         a.message, a.status, a.resolution_notes, a.resolved_by, a.resolved_at,
         a.created_at
  from public.moderation_appeals a
  join public.profiles p on p.id = a.user_id
  where requested_status is null or a.status = requested_status
  order by a.created_at asc;
end;
$$;

revoke all on function public.admin_list_appeals(text) from public, anon, authenticated;
grant execute on function public.admin_list_appeals(text) to authenticated;

create or replace function public.admin_resolve_appeal(
  requested_appeal_id uuid,
  requested_status text,
  requested_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  normalized_notes text := nullif(trim(coalesce(requested_notes, '')), '');
  current_appeal public.moderation_appeals%rowtype;
begin
  if public.current_moderation_role() is null then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;

  if requested_status is null or requested_status not in ('reviewing', 'resolved', 'denied') then
    raise exception 'Unknown appeal status.' using errcode = '22023';
  end if;

  if requested_status <> 'reviewing'
    and (normalized_notes is null or char_length(normalized_notes) < 3)
  then
    raise exception 'Add resolution notes of at least 3 characters.' using errcode = '22023';
  end if;

  select * into current_appeal
  from public.moderation_appeals
  where id = requested_appeal_id
  for update;

  if not found then
    raise exception 'The appeal could not be found.' using errcode = 'P0002';
  end if;

  if current_appeal.status in ('resolved', 'denied') then
    raise exception 'This appeal is already closed.' using errcode = '22023';
  end if;

  update public.moderation_appeals
  set status = requested_status,
      resolution_notes = coalesce(normalized_notes, resolution_notes),
      resolved_by = case when requested_status = 'reviewing' then null else caller_id end,
      resolved_at = case when requested_status = 'reviewing' then null else now() end
  where id = requested_appeal_id;

  perform public.log_audit_event(
    caller_id,
    'moderation.appeal_' || requested_status,
    'user',
    current_appeal.user_id,
    jsonb_build_object('appealId', requested_appeal_id, 'notes', normalized_notes)
  );
end;
$$;

revoke all on function public.admin_resolve_appeal(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_resolve_appeal(uuid, text, text) to authenticated;

create or replace function public.admin_search_members(
  requested_query text,
  requested_limit integer default 25
)
returns table (
  id uuid,
  username text,
  display_name text,
  role text,
  status text,
  suspended_until timestamptz,
  balance_tokens bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := trim(coalesce(requested_query, ''));
  safe_limit integer := least(greatest(coalesce(requested_limit, 25), 1), 50);
begin
  if public.current_moderation_role() is null then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;

  return query
  select p.id, p.username, p.display_name, p.role, p.status,
         p.suspended_until, coalesce(w.balance_tokens, 0), p.created_at
  from public.profiles p
  left join public.token_wallets w on w.user_id = p.id
  where normalized_query = ''
     or p.username ilike '%' || normalized_query || '%'
     or p.display_name ilike '%' || normalized_query || '%'
  order by p.created_at desc
  limit safe_limit;
end;
$$;

revoke all on function public.admin_search_members(text, integer) from public, anon, authenticated;
grant execute on function public.admin_search_members(text, integer) to authenticated;

create or replace function public.admin_member_overview(requested_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_profile public.profiles%rowtype;
  overview jsonb;
begin
  if public.current_moderation_role() is null then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;

  select * into target_profile from public.profiles where id = requested_user_id;
  if not found then
    raise exception 'The member could not be found.' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'profile', to_jsonb(target_profile),
    'balance_tokens', coalesce((
      select w.balance_tokens from public.token_wallets w where w.user_id = requested_user_id
    ), 0),
    'ledger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'bundle_id', l.bundle_id,
        'tokens_delta', l.tokens_delta,
        'amount_total', l.amount_total,
        'created_at', l.created_at
      ) order by l.created_at desc)
      from public.token_ledger l
      where l.user_id = requested_user_id
    ), '[]'::jsonb),
    'spends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'item_id', s.item_id,
        'item_name', s.item_name,
        'tokens_delta', s.tokens_delta,
        'created_at', s.created_at
      ) order by s.created_at desc)
      from public.token_spend_ledger s
      where s.user_id = requested_user_id
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.created_at desc)
      from public.moderation_notes n
      where n.subject_user_id = requested_user_id
    ), '[]'::jsonb),
    'appeals', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
      from public.moderation_appeals a
      where a.user_id = requested_user_id
    ), '[]'::jsonb),
    'purchase_reviews', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from public.token_purchase_reviews r
      where r.user_id = requested_user_id
    ), '[]'::jsonb),
    'moderation_actions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'action', m.action,
        'rationale', m.rationale,
        'expires_at', m.expires_at,
        'created_at', m.created_at
      ) order by m.created_at desc)
      from public.moderation_actions m
      where m.target_type = 'user' and m.target_id = requested_user_id
    ), '[]'::jsonb)
  ) into overview;

  return overview;
end;
$$;

revoke all on function public.admin_member_overview(uuid) from public, anon, authenticated;
grant execute on function public.admin_member_overview(uuid) to authenticated;

create or replace function public.admin_set_member_role(
  requested_user_id uuid,
  requested_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  previous_role text;
begin
  if public.current_moderation_role() is distinct from 'admin' then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  if requested_role is null or requested_role not in ('member', 'moderator', 'admin') then
    raise exception 'Unknown role.' using errcode = '22023';
  end if;

  if requested_user_id = caller_id then
    raise exception 'Administrators cannot change their own role.' using errcode = '42501';
  end if;

  select role into previous_role from public.profiles where id = requested_user_id for update;
  if not found then
    raise exception 'The member could not be found.' using errcode = 'P0002';
  end if;

  -- Never strand the platform without an administrator.
  if previous_role = 'admin' and requested_role <> 'admin' then
    if not exists (
      select 1 from public.profiles p
      where p.role = 'admin' and p.id <> requested_user_id
    ) then
      raise exception 'At least one administrator must remain.' using errcode = '22023';
    end if;
  end if;

  update public.profiles
  set role = requested_role,
      updated_at = now()
  where id = requested_user_id;

  perform public.log_audit_event(
    caller_id,
    'admin.member_role_changed',
    'user',
    requested_user_id,
    jsonb_build_object('previousRole', previous_role, 'nextRole', requested_role)
  );
end;
$$;

revoke all on function public.admin_set_member_role(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_member_role(uuid, text) to authenticated;

create or replace function public.admin_add_member_note(
  requested_user_id uuid,
  requested_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  normalized_body text := trim(coalesce(requested_body, ''));
  new_id uuid;
begin
  if public.current_moderation_role() is null then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;

  if char_length(normalized_body) < 2 or char_length(normalized_body) > 2000 then
    raise exception 'Add a note between 2 and 2,000 characters.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles where id = requested_user_id) then
    raise exception 'The member could not be found.' using errcode = 'P0002';
  end if;

  insert into public.moderation_notes (author_id, subject_user_id, body)
  values (caller_id, requested_user_id, normalized_body)
  returning id into new_id;

  perform public.log_audit_event(
    caller_id,
    'admin.member_note_added',
    'user',
    requested_user_id,
    jsonb_build_object('noteId', new_id)
  );

  return new_id;
end;
$$;

revoke all on function public.admin_add_member_note(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_add_member_note(uuid, text) to authenticated;

create or replace function public.admin_list_audit_events(
  requested_limit integer default 50,
  requested_offset integer default 0
)
returns table (
  id bigint,
  actor_id uuid,
  actor_username text,
  event_type text,
  subject_type text,
  subject_id uuid,
  details jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  safe_limit integer := least(greatest(coalesce(requested_limit, 50), 1), 200);
  safe_offset integer := greatest(coalesce(requested_offset, 0), 0);
begin
  if public.current_moderation_role() is null then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;

  return query
  select e.id, e.actor_id, p.username, e.event_type, e.subject_type,
         e.subject_id, e.details, e.created_at
  from public.audit_events e
  left join public.profiles p on p.id = e.actor_id
  order by e.created_at desc, e.id desc
  limit safe_limit
  offset safe_offset;
end;
$$;

revoke all on function public.admin_list_audit_events(integer, integer) from public, anon, authenticated;
grant execute on function public.admin_list_audit_events(integer, integer) to authenticated;

create or replace function public.admin_list_purchase_reviews(requested_status text default 'open')
returns table (
  id uuid,
  user_id uuid,
  checkout_session_id text,
  refund_event_id uuid,
  reason text,
  shortfall_tokens bigint,
  status text,
  notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.current_moderation_role() is null then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;

  if requested_status is not null
    and requested_status not in ('open', 'resolved', 'dismissed')
  then
    raise exception 'Unknown review status.' using errcode = '22023';
  end if;

  return query
  select r.id, r.user_id, r.checkout_session_id, r.refund_event_id, r.reason,
         r.shortfall_tokens, r.status, r.notes, r.resolved_by, r.resolved_at,
         r.created_at
  from public.token_purchase_reviews r
  where requested_status is null or r.status = requested_status
  order by r.created_at asc;
end;
$$;

revoke all on function public.admin_list_purchase_reviews(text) from public, anon, authenticated;
grant execute on function public.admin_list_purchase_reviews(text) to authenticated;

create or replace function public.admin_resolve_purchase_review(
  requested_review_id uuid,
  requested_status text,
  requested_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  normalized_notes text := nullif(trim(coalesce(requested_notes, '')), '');
  review_user_id uuid;
begin
  if public.current_moderation_role() is null then
    raise exception 'Moderator access is required.' using errcode = '42501';
  end if;

  if requested_status is null or requested_status not in ('resolved', 'dismissed') then
    raise exception 'Unknown review status.' using errcode = '22023';
  end if;

  if normalized_notes is null or char_length(normalized_notes) < 3 then
    raise exception 'Add resolution notes of at least 3 characters.' using errcode = '22023';
  end if;

  select user_id into review_user_id
  from public.token_purchase_reviews
  where id = requested_review_id
  for update;

  if not found then
    raise exception 'The review could not be found.' using errcode = 'P0002';
  end if;

  update public.token_purchase_reviews
  set status = requested_status,
      notes = normalized_notes,
      resolved_by = caller_id,
      resolved_at = now()
  where id = requested_review_id;

  perform public.log_audit_event(
    caller_id,
    'token.purchase_review_' || requested_status,
    'user',
    review_user_id,
    jsonb_build_object('reviewId', requested_review_id, 'notes', normalized_notes)
  );
end;
$$;

revoke all on function public.admin_resolve_purchase_review(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_resolve_purchase_review(uuid, text, text) to authenticated;

commit;
