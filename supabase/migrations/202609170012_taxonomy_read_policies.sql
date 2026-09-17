-- Reference taxonomies are shared, non-private data required by onboarding,
-- profile editing, and nested profile queries. Members may read them, but all
-- writes remain restricted to trusted backend/admin roles.
alter table public.instruments enable row level security;
alter table public.genres enable row level security;

drop policy if exists "members read instruments" on public.instruments;
create policy "members read instruments"
on public.instruments for select
to authenticated
using (true);

drop policy if exists "members read genres" on public.genres;
create policy "members read genres"
on public.genres for select
to authenticated
using (true);
