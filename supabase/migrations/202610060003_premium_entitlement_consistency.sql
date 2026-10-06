-- Make every Premium capability use the unified entitlement layer. This covers
-- App Store/RevenueCat subscriptions as well as referral, promotion, and admin grants.

create or replace function public.enforce_active_band_call_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  call_limit integer;
begin
  call_limit := case when public.has_delos_music_pro(new.creator_id) then 3 else 1 end;
  if (
    select count(*)
    from public.band_calls
    where creator_id = new.creator_id and active
  ) >= call_limit then
    raise exception 'Active band call limit reached';
  end if;
  return new;
end;
$$;

-- Advanced discovery controls are a Premium capability. The trigger prevents
-- modified/older clients from bypassing the UI gate. Basic age, distance, role,
-- genre, goal, and commitment filters remain available to everyone.
create or replace function public.enforce_advanced_discovery_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    coalesce(new.available_now_only, false)
    or coalesce(new.transportation_required, false)
    or coalesce(new.performance_ready_gear_required, false)
  ) and not public.has_delos_music_pro(new.user_id) then
    raise exception 'Premium membership required for Practical Fit filters';
  end if;
  return new;
end;
$$;

drop trigger if exists advanced_discovery_entitlement on public.discovery_preferences;
create trigger advanced_discovery_entitlement
before insert or update of available_now_only, transportation_required,
  performance_ready_gear_required on public.discovery_preferences
for each row execute procedure public.enforce_advanced_discovery_entitlement();

-- When access ends, clear Premium-only filters so expired members never keep
-- receiving a silently narrowed deck.
create or replace function public.my_discovery_preferences()
returns table(
  max_distance_km integer,
  age_min integer,
  age_max integer,
  instrument_names text[],
  genre_names text[],
  goals text[],
  commitments text[],
  available_now_only boolean,
  transportation_required boolean,
  performance_ready_gear_required boolean,
  notifications_muted boolean
)
language sql
security definer
set search_path = public
as $$
  select
    p.max_distance_km,
    p.age_min,
    p.age_max,
    p.instrument_names,
    p.genre_names,
    p.goals,
    p.commitments,
    case when public.has_delos_music_pro(auth.uid()) then p.available_now_only else false end,
    case when public.has_delos_music_pro(auth.uid()) then p.transportation_required else false end,
    case when public.has_delos_music_pro(auth.uid()) then p.performance_ready_gear_required else false end,
    p.notifications_muted
  from public.discovery_preferences p
  where p.user_id = auth.uid();
$$;

revoke all on function public.my_discovery_preferences() from public;
grant execute on function public.my_discovery_preferences() to authenticated;
