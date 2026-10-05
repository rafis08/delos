-- Avatars are profile identity, not performance samples.
alter table public.musician_profiles
  add column if not exists profile_photo_path text;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos', 'profile-photos', false, 10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members read visible profile photos" on storage.objects;
create policy "members read visible profile photos" on storage.objects
for select to authenticated using (
  bucket_id = 'profile-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.musician_profiles p
      where p.profile_photo_path = name
        and p.discovery_visible
        and not public.is_blocked(p.user_id)
    )
  )
);

drop policy if exists "users upload own profile photos" on storage.objects;
create policy "users upload own profile photos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users delete own profile photos" on storage.objects;
create policy "users delete own profile photos" on storage.objects
for delete to authenticated using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Make the intended sample insert authorization explicit for environments that missed it.
drop policy if exists "members insert own media samples" on public.media_samples;
create policy "members insert own media samples" on public.media_samples
for insert to authenticated with check (profile_id = auth.uid());

-- Legacy avatar records remain for rollback safety, but do not consume performance slots.
create or replace function public.enforce_media_entitlement() returns trigger
language plpgsql security definer set search_path=public as $$
declare media_limit int;
begin
  media_limit := case when public.has_delos_music_pro(new.profile_id) then 10 else 3 end;
  if (
    select count(*) from public.media_samples
    where profile_id = new.profile_id and media_type in ('audio', 'video')
  ) >= media_limit then
    raise exception 'Media limit reached. Remove a sample or upgrade to Premium.';
  end if;
  return new;
end $$;

create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path=public,auth,storage as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Not authenticated'; end if;
  delete from storage.objects
  where bucket_id in ('profile-media', 'profile-photos')
    and (storage.foldername(name))[1]=actor::text;
  delete from auth.users where id=actor;
end $$;
