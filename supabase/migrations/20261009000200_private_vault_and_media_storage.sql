create table public.private_profile_vault (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  ciphertext text not null check (char_length(ciphertext) between 1 and 200000),
  salt text not null check (char_length(salt) between 20 and 100),
  updated_at timestamptz not null default now()
);

alter table public.private_profile_vault enable row level security;
revoke all on public.private_profile_vault from public, anon;
grant select, insert, update, delete on public.private_profile_vault to authenticated;

create policy "users manage only their encrypted profile vault"
  on public.private_profile_vault
  for all to authenticated
  using (user_id = (select auth.uid()) and public.is_active_user())
  with check (user_id = (select auth.uid()) and public.is_active_user());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-media',
  'community-media',
  false,
  104857600,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload community media into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users read media referenced by visible content or owned by them"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'community-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.posts
        where posts.media_url = storage.objects.name
          and (posts.state = 'visible' or posts.author_id = (select auth.uid()) or public.is_moderator())
      )
      or exists (
        select 1 from public.short_videos
        where short_videos.video_url = storage.objects.name
          and (short_videos.state = 'visible' or short_videos.author_id = (select auth.uid()) or public.is_moderator())
      )
    )
  );

create policy "users delete their own community media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
