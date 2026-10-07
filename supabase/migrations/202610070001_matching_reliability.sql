-- Make mutual matching idempotent and ensure only discoverable musician profiles can be liked.
create or replace function public.create_like_and_match(target_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  low_id uuid;
  high_id uuid;
  matched_id uuid;
  tier_name text;
  created_like boolean := false;
begin
  if actor is null or actor = target_user_id then raise exception 'Invalid like'; end if;
  if not exists (
    select 1 from musician_profiles
    where user_id = target_user_id and discovery_visible
  ) then raise exception 'Member unavailable'; end if;
  if public.is_blocked(target_user_id) then raise exception 'Interaction unavailable'; end if;

  select tier into tier_name from subscription_status where user_id = actor;
  if coalesce(tier_name, 'free') = 'free' and (
    select count(*) from likes
    where actor_id = actor and created_at >= date_trunc('day', now())
  ) >= 15 then
    raise exception 'Daily like limit reached. Come back tomorrow or explore Amplified.';
  end if;

  insert into likes(actor_id, target_id) values(actor, target_user_id)
  on conflict do nothing returning true into created_like;
  delete from passes where actor_id = actor and target_id = target_user_id;
  if not exists (
    select 1 from likes where actor_id = target_user_id and target_id = actor
  ) then return null; end if;

  low_id := least(actor, target_user_id);
  high_id := greatest(actor, target_user_id);
  insert into matches(user_a, user_b) values(low_id, high_id)
  on conflict(user_a, user_b) do update set user_a = excluded.user_a
  returning id into matched_id;
  insert into conversations(match_id) values(matched_id) on conflict(match_id) do nothing;

  -- Only the action that completes a new mutual pair creates notifications.
  if created_like then
    insert into notifications(user_id, kind, title, body) values
      (actor, 'match', 'It’s a match', 'You can start a conversation now.'),
      (target_user_id, 'match', 'It’s a match', 'You can start a conversation now.');
  end if;
  return matched_id;
end;
$$;

revoke all on function public.create_like_and_match(uuid) from public;
grant execute on function public.create_like_and_match(uuid) to authenticated;

-- Unknown coordinates are unknown, not zero kilometers away. The client fails closed on null
-- so the travel-radius hard requirement remains truthful.
create or replace function public.discovery_distances()
returns table(user_id uuid, distance_km double precision)
language sql stable security definer set search_path = public as $$
  select candidate.user_id,
    case
      when mine.approximate_latitude is null
        or mine.approximate_longitude is null
        or candidate.approximate_latitude is null
        or candidate.approximate_longitude is null then null
      else 6371 * acos(least(1, greatest(-1,
        cos(radians(mine.approximate_latitude))
        * cos(radians(candidate.approximate_latitude))
        * cos(radians(candidate.approximate_longitude) - radians(mine.approximate_longitude))
        + sin(radians(mine.approximate_latitude)) * sin(radians(candidate.approximate_latitude))
      )))
    end
  from discovery_preferences mine
  cross join discovery_preferences candidate
  where mine.user_id = auth.uid() and candidate.user_id <> auth.uid();
$$;

revoke all on function public.discovery_distances() from public;
grant execute on function public.discovery_distances() to authenticated;
