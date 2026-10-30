-- Preserve existing access while avoiding repeated auth.uid() evaluation and
-- overlapping SELECT policies on page visibility.
-- Guard each table because connected database snapshots can differ.
-- Drop both legacy and replacement policy names so this migration is safe to
-- replay when production/staging migration ledgers have different versions.

do $$
begin
  if to_regclass('public.platform_page_visibility') is not null then
    execute 'drop policy if exists "developers and owners manage page visibility" on public.platform_page_visibility';
    execute 'drop policy if exists "developers and owners insert page visibility" on public.platform_page_visibility';
    execute 'drop policy if exists "developers and owners update page visibility" on public.platform_page_visibility';
    execute 'drop policy if exists "developers and owners delete page visibility" on public.platform_page_visibility';
    execute 'create policy "developers and owners insert page visibility" on public.platform_page_visibility for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = ''active'' and p.role = any (array[''developer'',''owner''])))';
    execute 'create policy "developers and owners update page visibility" on public.platform_page_visibility for update to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = ''active'' and p.role = any (array[''developer'',''owner'']))) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = ''active'' and p.role = any (array[''developer'',''owner''])))';
    execute 'create policy "developers and owners delete page visibility" on public.platform_page_visibility for delete to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = ''active'' and p.role = any (array[''developer'',''owner''])))';
  end if;

  if to_regclass('public.sanctuary_feedback') is not null then
    execute 'drop policy if exists "Anyone can submit sanctuary feedback" on public.sanctuary_feedback';
    execute 'drop policy if exists "Developers and owner can read sanctuary feedback" on public.sanctuary_feedback';
    execute 'drop policy if exists "Developers and owner can update sanctuary feedback" on public.sanctuary_feedback';
    execute 'create policy "Anyone can submit sanctuary feedback" on public.sanctuary_feedback for insert to anon, authenticated with check (char_length(btrim(title)) between 3 and 100 and char_length(btrim(details)) between 5 and 2000 and ((submitted_by is null and submitter_kind = ''guest'') or (submitted_by = (select auth.uid()) and submitter_kind = ''member'')))';
    execute 'create policy "Developers and owner can read sanctuary feedback" on public.sanctuary_feedback for select to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array[''developer'',''owner''])))';
    execute 'create policy "Developers and owner can update sanctuary feedback" on public.sanctuary_feedback for update to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array[''developer'',''owner'']))) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array[''developer'',''owner''])))';
  end if;
end $$;
