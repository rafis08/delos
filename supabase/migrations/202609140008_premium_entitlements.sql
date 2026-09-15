create or replace function public.my_like_allowance()
returns table(tier text, used_count integer, daily_limit integer, remaining_count integer)
language sql security definer set search_path=public stable as $$
  with entitlement as (
    select coalesce((select s.tier from subscription_status s where s.user_id=auth.uid()),'free') as value
  ), usage as (
    select count(*)::integer as value from likes
    where actor_id=auth.uid() and created_at>=date_trunc('day',now() at time zone 'utc')
  )
  select entitlement.value, usage.value,
    case when entitlement.value='amplified' then null else 15 end,
    case when entitlement.value='amplified' then null else greatest(0,15-usage.value) end
  from entitlement,usage;
$$;

create or replace function public.profiles_who_liked_me()
returns table(profile_id uuid, liked_at timestamptz)
language plpgsql security definer set search_path=public stable as $$
begin
  if coalesce((select tier from subscription_status where user_id=auth.uid()),'free')<>'amplified' then
    raise exception 'Amplified membership required';
  end if;
  return query
    select l.actor_id,l.created_at from likes l
    where l.target_id=auth.uid()
      and not exists(select 1 from likes mine where mine.actor_id=auth.uid() and mine.target_id=l.actor_id)
      and not exists(select 1 from blocks b where (b.blocker_id=auth.uid() and b.blocked_id=l.actor_id) or (b.blocker_id=l.actor_id and b.blocked_id=auth.uid()))
    order by l.created_at desc;
end $$;

create or replace function public.rewind_last_pass()
returns uuid language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
  if coalesce((select tier from subscription_status where user_id=auth.uid()),'free')<>'amplified' then
    raise exception 'Amplified membership required';
  end if;
  select target_id into target from passes where actor_id=auth.uid() order by created_at desc limit 1;
  if target is not null then delete from passes where actor_id=auth.uid() and target_id=target; end if;
  return target;
end $$;

revoke all on function public.my_like_allowance(),public.profiles_who_liked_me(),public.rewind_last_pass() from public;
grant execute on function public.my_like_allowance(),public.profiles_who_liked_me(),public.rewind_last_pass() to authenticated;

alter table public.discovery_preferences
  add column if not exists available_now_only boolean not null default false,
  add column if not exists transportation_required boolean not null default false,
  add column if not exists performance_ready_gear_required boolean not null default false;

alter table public.musician_profiles
  add column if not exists boosted_until timestamptz,
  add column if not exists last_boosted_at timestamptz;

create or replace function public.activate_profile_boost()
returns timestamptz language plpgsql security definer set search_path=public as $$
declare result timestamptz:=now()+interval '24 hours';
begin
  if coalesce((select tier from subscription_status where user_id=auth.uid()),'free')<>'amplified' then
    raise exception 'Amplified membership required';
  end if;
  if exists(select 1 from musician_profiles where user_id=auth.uid() and last_boosted_at>now()-interval '7 days') then
    raise exception 'Your next weekly boost is not ready yet';
  end if;
  update musician_profiles set boosted_until=result,last_boosted_at=now() where user_id=auth.uid();
  return result;
end $$;

create or replace function public.enforce_media_entitlement()
returns trigger language plpgsql security definer set search_path=public as $$
declare media_limit integer;
begin
  media_limit:=case when coalesce((select tier from subscription_status where user_id=new.profile_id),'free')='amplified' then 10 else 3 end;
  if (select count(*) from media_samples where profile_id=new.profile_id)>=media_limit then
    raise exception 'Media limit reached. Remove a sample or upgrade to Amplified.';
  end if;
  return new;
end $$;
drop trigger if exists media_entitlement_limit on public.media_samples;
create trigger media_entitlement_limit before insert on public.media_samples for each row execute procedure public.enforce_media_entitlement();

revoke all on function public.activate_profile_boost() from public;
grant execute on function public.activate_profile_boost() to authenticated;
