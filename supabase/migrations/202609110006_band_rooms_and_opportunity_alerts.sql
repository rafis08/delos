create table public.collaboration_items (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  item_type text not null check(item_type in ('song','task','note')), text text not null check(char_length(text) between 1 and 300),
  completed boolean not null default false, created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index collaboration_items_conversation_idx on public.collaboration_items(conversation_id,created_at);
alter table public.collaboration_items enable row level security;
create policy "conversation members read room" on public.collaboration_items for select to authenticated using(exists(select 1 from conversations c join matches m on m.id=c.match_id where c.id=conversation_id and auth.uid() in(m.user_a,m.user_b)));
create policy "conversation members add room items" on public.collaboration_items for insert to authenticated with check(created_by=auth.uid() and exists(select 1 from conversations c join matches m on m.id=c.match_id where c.id=conversation_id and auth.uid() in(m.user_a,m.user_b)));
create policy "conversation members update room items" on public.collaboration_items for update to authenticated using(exists(select 1 from conversations c join matches m on m.id=c.match_id where c.id=conversation_id and auth.uid() in(m.user_a,m.user_b)));
create policy "conversation members delete room items" on public.collaboration_items for delete to authenticated using(exists(select 1 from conversations c join matches m on m.id=c.match_id where c.id=conversation_id and auth.uid() in(m.user_a,m.user_b)));

create or replace function public.notify_matching_band_call()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into notifications(user_id,kind,title,body)
 select dp.user_id,'session','New Band Call near your sound',new.title from discovery_preferences dp
 where dp.user_id<>new.creator_id and not dp.notifications_muted
 and ((cardinality(dp.genre_names)>0 and dp.genre_names && new.genres) or (cardinality(dp.instrument_names)>0 and dp.instrument_names && new.roles_needed));
 return new;
end $$;
drop trigger if exists band_call_match_alert on public.band_calls;
create trigger band_call_match_alert after insert on public.band_calls for each row execute procedure public.notify_matching_band_call();
