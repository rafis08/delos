-- Follow-up hardening for referral helpers, entitlement privacy, and storage abuse.

-- Internal SECURITY DEFINER helpers are invoked by trusted functions/triggers only.
-- PostgreSQL grants new functions to PUBLIC by default, so make that boundary explicit.
revoke all on function public.make_referral_code(uuid) from public, anon, authenticated;
revoke all on function public.ensure_referral_code() from public, anon, authenticated;
revoke all on function public.capture_new_user_referral() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.activate_next_queued_grant(uuid) from public, anon, authenticated;
revoke all on function public.award_referral_milestones(uuid) from public, anon, authenticated;
revoke all on function public.enforce_media_entitlement() from public, anon, authenticated;

-- A member may check only their own entitlement. Trusted nested function calls still run
-- as the function owner, but arbitrary client UUID probes fail closed.
create or replace function public.has_delos_music_pro(target_user_id uuid default auth.uid())
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or target_user_id is distinct from auth.uid() then return false; end if;
  perform activate_next_queued_grant(target_user_id);
  return exists(
    select 1 from subscription_status
    where user_id=target_user_id and tier='amplified'
      and (expires_at is null or expires_at>now())
  ) or exists(
    select 1 from entitlement_grants
    where user_id=target_user_id and status='active'
      and starts_at<=now() and ends_at>now()
  );
end;
$$;
revoke all on function public.has_delos_music_pro(uuid) from public, anon;
grant execute on function public.has_delos_music_pro(uuid) to authenticated;

-- Storage policies previously limited individual file size but not total object count.
-- This owner-scoped helper prevents unregistered-object storage exhaustion.
create or replace function public.can_upload_profile_object(target_bucket text, target_name text)
returns boolean language sql stable security definer set search_path=public,storage as $$
  select auth.uid() is not null
    and target_bucket in ('profile-media','profile-photos')
    and (storage.foldername(target_name))[1] = auth.uid()::text
    and (
      select count(*) from storage.objects o
      where o.bucket_id=target_bucket
        and (storage.foldername(o.name))[1]=auth.uid()::text
    ) < case when target_bucket='profile-photos' then 5 else 20 end
    and (
      select count(*) from storage.objects o
      where o.bucket_id=target_bucket
        and (storage.foldername(o.name))[1]=auth.uid()::text
        and o.created_at > now()-interval '1 hour'
    ) < case when target_bucket='profile-photos' then 5 else 20 end;
$$;
revoke all on function public.can_upload_profile_object(text,text) from public, anon;
grant execute on function public.can_upload_profile_object(text,text) to authenticated;

drop policy if exists "users upload validated own media" on storage.objects;
create policy "users upload validated own media" on storage.objects
for insert to authenticated with check (
  bucket_id='profile-media'
  and public.can_upload_profile_object(bucket_id,name)
  and coalesce(metadata->>'mimetype','') in (
    'image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/x-m4a',
    'audio/aac','audio/wav','audio/webm','audio/ogg','video/mp4','video/quicktime'
  )
  and coalesce(metadata->>'size','') ~ '^[0-9]+$'
  and (metadata->>'size')::bigint <= case
    when metadata->>'mimetype' like 'image/%' then 10000000
    when metadata->>'mimetype' like 'audio/%' then 25000000
    else 100000000
  end
);

drop policy if exists "users upload own profile photos" on storage.objects;
create policy "users upload own profile photos" on storage.objects
for insert to authenticated with check (
  bucket_id='profile-photos'
  and public.can_upload_profile_object(bucket_id,name)
);
