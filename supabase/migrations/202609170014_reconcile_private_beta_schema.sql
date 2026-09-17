-- Reconcile objects that were missing from a partially applied legacy migration.
alter table public.discovery_preferences add column if not exists instrument_names text[] not null default '{}';
alter table public.discovery_preferences add column if not exists genre_names text[] not null default '{}';
alter table public.discovery_preferences add column if not exists approximate_latitude double precision check(approximate_latitude between -90 and 90);
alter table public.discovery_preferences add column if not exists approximate_longitude double precision check(approximate_longitude between -180 and 180);
alter table public.users add column if not exists role text not null default 'member' check(role in ('member','moderator','admin'));

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check(platform in ('ios','android','web')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.push_devices enable row level security;
drop policy if exists "own push devices" on public.push_devices;
create policy "own push devices" on public.push_devices for all to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

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
  insert into reports(reporter_id,reported_id,reason,details) values(actor,target_user_id,report_reason,report_details) returning id into result;
  return result;
end $$;

create or replace function public.my_blocked_profiles()
returns setof public.musician_profiles language sql stable security definer set search_path=public as $$
  select p.* from blocks b join musician_profiles p on p.user_id=b.blocked_id where b.blocker_id=auth.uid() order by b.created_at desc;
$$;

create or replace function public.discovery_distances()
returns table(user_id uuid,distance_km double precision) language sql stable security definer set search_path=public as $$
  select candidate.user_id,
    case when mine.approximate_latitude is null or candidate.approximate_latitude is null then 0
    else 6371*acos(least(1,greatest(-1,
      cos(radians(mine.approximate_latitude))*cos(radians(candidate.approximate_latitude))*
      cos(radians(candidate.approximate_longitude)-radians(mine.approximate_longitude))+
      sin(radians(mine.approximate_latitude))*sin(radians(candidate.approximate_latitude))))) end
  from discovery_preferences mine cross join discovery_preferences candidate
  where mine.user_id=auth.uid() and candidate.user_id<>auth.uid();
$$;

revoke all on function public.mark_conversation_read(uuid),public.respond_to_proposal(uuid,public.proposal_status),public.moderation_queue(),public.resolve_report(uuid,text),public.submit_report_rate_limited(uuid,text,text),public.my_blocked_profiles(),public.discovery_distances() from public;
grant execute on function public.mark_conversation_read(uuid),public.respond_to_proposal(uuid,public.proposal_status),public.moderation_queue(),public.resolve_report(uuid,text),public.submit_report_rate_limited(uuid,text,text),public.my_blocked_profiles(),public.discovery_distances() to authenticated;
