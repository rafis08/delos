-- Private-beta product controls: preferences, quotas, read state, proposals, push devices and moderation.
alter table public.discovery_preferences add column if not exists instrument_names text[] not null default '{}';
alter table public.discovery_preferences add column if not exists genre_names text[] not null default '{}';
alter table public.discovery_preferences add column if not exists approximate_latitude double precision check(approximate_latitude between -90 and 90);
alter table public.discovery_preferences add column if not exists approximate_longitude double precision check(approximate_longitude between -180 and 180);
alter table public.users add column if not exists role text not null default 'member' check(role in ('member','moderator','admin'));
create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  expo_push_token text not null unique, platform text not null check(platform in ('ios','android','web')),
  enabled boolean not null default true, updated_at timestamptz not null default now()
);
alter table public.push_devices enable row level security;
create policy "own push devices" on public.push_devices for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.create_like_and_match(target_user_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); low_id uuid; high_id uuid; matched_id uuid; tier_name text;
begin
  if actor is null or actor=target_user_id then raise exception 'Invalid like'; end if;
  select tier into tier_name from subscription_status where user_id=actor;
  if coalesce(tier_name,'free')='free' and (select count(*) from likes where actor_id=actor and created_at>=date_trunc('day',now()))>=15 then
    raise exception 'Daily like limit reached. Come back tomorrow or explore Amplified.';
  end if;
  if public.is_blocked(target_user_id) then raise exception 'Interaction unavailable'; end if;
  insert into likes(actor_id,target_id) values(actor,target_user_id) on conflict do nothing;
  delete from passes where actor_id=actor and target_id=target_user_id;
  if not exists(select 1 from likes where actor_id=target_user_id and target_id=actor) then return null; end if;
  low_id:=least(actor,target_user_id); high_id:=greatest(actor,target_user_id);
  insert into matches(user_a,user_b) values(low_id,high_id) on conflict(user_a,user_b) do update set user_a=excluded.user_a returning id into matched_id;
  insert into conversations(match_id) values(matched_id) on conflict(match_id) do nothing;
  if not exists(select 1 from notifications where user_id=actor and kind='match' and created_at>now()-interval '1 minute') then
    insert into notifications(user_id,kind,title,body) values(actor,'match','It’s a match','You can start a conversation now.'),(target_user_id,'match','It’s a match','You can start a conversation now.');
  end if;
  return matched_id;
end $$;

create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from conversations c join matches m on m.id=c.match_id where c.id=target_conversation_id and auth.uid() in(m.user_a,m.user_b)) then raise exception 'Conversation unavailable'; end if;
  update messages set read_at=now() where conversation_id=target_conversation_id and sender_id<>auth.uid() and read_at is null;
end $$;

create or replace function public.respond_to_proposal(proposal_id uuid, response public.proposal_status)
returns public.session_proposals language plpgsql security definer set search_path=public as $$
declare result public.session_proposals; recipient uuid;
begin
  if response not in ('accepted','declined') then raise exception 'Invalid response'; end if;
  update session_proposals p set status=response,responded_at=now()
  where p.id=proposal_id and p.status='pending' and exists(select 1 from conversations c join matches m on m.id=c.match_id where c.id=p.conversation_id and auth.uid() in(m.user_a,m.user_b)) returning * into result;
  if result.id is null then raise exception 'Proposal unavailable'; end if;
  recipient:=result.proposer_id;
  insert into notifications(user_id,kind,title,body) values(recipient,'session','Proposal '||response,'Your '||lower(result.kind)||' proposal was '||response||'.');
  return result;
end $$;

create or replace function public.moderation_queue()
returns table(id uuid,reported_id uuid,reason text,details text,status text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select r.id,r.reported_id,r.reason,r.details,r.status,r.created_at from reports r
  where exists(select 1 from users u where u.id=auth.uid() and u.role in('moderator','admin')) order by r.created_at desc;
$$;
create or replace function public.resolve_report(report_id uuid,resolution text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if resolution not in('reviewed','dismissed','actioned') or not exists(select 1 from users where id=auth.uid() and role in('moderator','admin')) then raise exception 'Not authorized'; end if;
  update reports set status=resolution where id=report_id;
end $$;
create or replace function public.submit_report_rate_limited(target_user_id uuid,report_reason text,report_details text)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; actor uuid:=auth.uid();
begin
  if actor is null or actor=target_user_id or char_length(report_reason)<1 or char_length(report_details)>1000 then raise exception 'Invalid report'; end if;
  if (select count(*) from reports where reporter_id=actor and created_at>now()-interval '1 hour')>=5 then raise exception 'Report limit reached. Try again later.'; end if;
  insert into reports(reporter_id,reported_id,reason,details) values(actor,target_user_id,report_reason,report_details) returning id into result; return result;
end $$;
create or replace function public.my_blocked_profiles()
returns setof public.musician_profiles language sql stable security definer set search_path=public as $$
  select p.* from blocks b join musician_profiles p on p.user_id=b.blocked_id where b.blocker_id=auth.uid() order by b.created_at desc;
$$;
create or replace function public.discovery_distances()
returns table(user_id uuid,distance_km double precision) language sql stable security definer set search_path=public as $$
  select candidate.user_id, case when mine.approximate_latitude is null or candidate.approximate_latitude is null then 0 else 6371*acos(least(1,greatest(-1,cos(radians(mine.approximate_latitude))*cos(radians(candidate.approximate_latitude))*cos(radians(candidate.approximate_longitude)-radians(mine.approximate_longitude))+sin(radians(mine.approximate_latitude))*sin(radians(candidate.approximate_latitude))))) end from discovery_preferences mine cross join discovery_preferences candidate where mine.user_id=auth.uid() and candidate.user_id<>auth.uid();
$$;
revoke all on function public.mark_conversation_read(uuid),public.respond_to_proposal(uuid,public.proposal_status),public.moderation_queue(),public.resolve_report(uuid,text),public.submit_report_rate_limited(uuid,text,text),public.my_blocked_profiles(),public.discovery_distances() from public;
grant execute on function public.mark_conversation_read(uuid),public.respond_to_proposal(uuid,public.proposal_status),public.moderation_queue(),public.resolve_report(uuid,text),public.submit_report_rate_limited(uuid,text,text),public.my_blocked_profiles(),public.discovery_distances() to authenticated;
