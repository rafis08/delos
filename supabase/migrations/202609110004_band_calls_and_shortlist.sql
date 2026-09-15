create table public.saved_profiles (
  user_id uuid not null references public.users(id) on delete cascade,
  saved_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,saved_user_id), check(user_id<>saved_user_id)
);
create table public.band_calls (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.users(id) on delete cascade,
  title text not null check(char_length(title) between 4 and 80), description text not null check(char_length(description) between 20 and 600),
  general_location text not null, genres text[] not null default '{}', roles_needed text[] not null check(cardinality(roles_needed)>0),
  commitment public.commitment_level not null, rehearsal_frequency text not null, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index band_calls_active_created_idx on public.band_calls(created_at desc) where active;
alter table public.saved_profiles enable row level security; alter table public.band_calls enable row level security;
create policy "own shortlist" on public.saved_profiles for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "members read active band calls" on public.band_calls for select to authenticated using(active or creator_id=auth.uid());
create policy "owners create band calls" on public.band_calls for insert to authenticated with check(creator_id=auth.uid());
create policy "owners manage band calls" on public.band_calls for update to authenticated using(creator_id=auth.uid()) with check(creator_id=auth.uid());
create policy "owners delete band calls" on public.band_calls for delete to authenticated using(creator_id=auth.uid());

create or replace function public.band_call_feed()
returns table(id uuid,creator_id uuid,creator_name text,title text,description text,general_location text,genres text[],roles_needed text[],commitment public.commitment_level,rehearsal_frequency text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select b.id,b.creator_id,p.display_name,b.title,b.description,b.general_location,b.genres,b.roles_needed,b.commitment,b.rehearsal_frequency,b.created_at
 from band_calls b join musician_profiles p on p.user_id=b.creator_id where b.active and not public.is_blocked(b.creator_id) order by b.created_at desc;
$$;
create or replace function public.my_saved_profiles()
returns setof public.musician_profiles language sql stable security definer set search_path=public as $$
 select p.* from saved_profiles s join musician_profiles p on p.user_id=s.saved_user_id where s.user_id=auth.uid() and not public.is_blocked(p.user_id) order by s.created_at desc;
$$;
revoke all on function public.band_call_feed(),public.my_saved_profiles() from public;
grant execute on function public.band_call_feed(),public.my_saved_profiles() to authenticated;
