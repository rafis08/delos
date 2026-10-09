-- Prevent a member from pointing their profile records at another member's private storage path,
-- and make block/privacy behavior consistent across nested profile and opportunity reads.

alter table public.media_samples
  drop constraint if exists media_samples_owned_storage_path;
alter table public.media_samples
  add constraint media_samples_owned_storage_path
  check (split_part(storage_path, '/', 1) = profile_id::text) not valid;

alter table public.musician_profiles
  drop constraint if exists musician_profiles_owned_photo_path;
alter table public.musician_profiles
  add constraint musician_profiles_owned_photo_path
  check (
    profile_photo_path is null
    or split_part(profile_photo_path, '/', 1) = user_id::text
  ) not valid;

drop policy if exists "authorized members read profile media" on storage.objects;
create policy "authorized members read profile media" on storage.objects
for select to authenticated using (
  bucket_id = 'profile-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.media_samples ms
      join public.musician_profiles p on p.user_id = ms.profile_id
      where ms.storage_path = name
        and split_part(ms.storage_path, '/', 1) = ms.profile_id::text
        and p.discovery_visible
        and not public.is_blocked(p.user_id)
    )
  )
);

drop policy if exists "members read visible profile photos" on storage.objects;
create policy "members read visible profile photos" on storage.objects
for select to authenticated using (
  bucket_id = 'profile-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.musician_profiles p
      where p.profile_photo_path = name
        and split_part(p.profile_photo_path, '/', 1) = p.user_id::text
        and p.discovery_visible
        and not public.is_blocked(p.user_id)
    )
  )
);

do $$
declare child_table text;
begin
  foreach child_table in array array[
    'profile_instruments', 'profile_genres', 'influences', 'availability'
  ] loop
    execute format('drop policy if exists "profile child read %1$s" on public.%1$I', child_table);
    execute format(
      'create policy "profile child read %1$s" on public.%1$I for select to authenticated using (
        exists (
          select 1 from public.musician_profiles p
          where p.user_id = profile_id
            and (p.user_id = auth.uid() or (p.discovery_visible and not public.is_blocked(p.user_id)))
        )
      )',
      child_table
    );
  end loop;
end
$$;

drop policy if exists "profile child read media_samples" on public.media_samples;
drop policy if exists "profile child own media_samples" on public.media_samples;
drop policy if exists "members insert own media samples" on public.media_samples;
create policy "members read authorized media samples" on public.media_samples
for select to authenticated using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.musician_profiles p
    where p.user_id = profile_id
      and p.discovery_visible
      and not public.is_blocked(p.user_id)
  )
);
create policy "members insert owned media samples" on public.media_samples
for insert to authenticated with check (
  profile_id = auth.uid()
  and split_part(storage_path, '/', 1) = auth.uid()::text
);
create policy "members update owned media samples" on public.media_samples
for update to authenticated using (profile_id = auth.uid())
with check (
  profile_id = auth.uid()
  and split_part(storage_path, '/', 1) = auth.uid()::text
);
create policy "members delete owned media samples" on public.media_samples
for delete to authenticated using (profile_id = auth.uid());

drop policy if exists "members read active band calls" on public.band_calls;
create policy "members read unblocked active band calls" on public.band_calls
for select to authenticated using (
  creator_id = auth.uid()
  or (active and not public.is_blocked(creator_id))
);

drop policy if exists "own shortlist" on public.saved_profiles;
create policy "members read own shortlist" on public.saved_profiles
for select to authenticated using (user_id = auth.uid());
create policy "members add unblocked profiles to shortlist" on public.saved_profiles
for insert to authenticated with check (
  user_id = auth.uid()
  and saved_user_id <> auth.uid()
  and not public.is_blocked(saved_user_id)
  and exists (select 1 from public.musician_profiles p where p.user_id = saved_user_id)
);
create policy "members remove own shortlist entries" on public.saved_profiles
for delete to authenticated using (user_id = auth.uid());

alter table public.push_devices
  drop constraint if exists push_devices_token_length;
alter table public.push_devices
  add constraint push_devices_token_length
  check (char_length(expo_push_token) between 10 and 512) not valid;

alter table public.support_tickets
  drop constraint if exists support_tickets_diagnostics_size;
alter table public.support_tickets
  add constraint support_tickets_diagnostics_size
  check (jsonb_typeof(diagnostics) = 'object' and pg_column_size(diagnostics) <= 8192) not valid;
