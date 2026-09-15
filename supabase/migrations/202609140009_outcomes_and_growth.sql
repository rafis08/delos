-- Outcome analytics and responsible marketplace growth controls.
create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.users(id) on delete cascade,
  event_name text not null check(event_name in(
    'discovery_viewed','connection_sent','match_created','first_message_sent',
    'session_proposed','session_accepted','session_confirmed','premium_viewed','checkout_started'
  )),
  properties jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check(jsonb_typeof(properties)='object')
);
create index if not exists product_events_funnel_idx on public.product_events(event_name,created_at desc);
create index if not exists product_events_user_idx on public.product_events(user_id,created_at desc);
alter table public.product_events enable row level security;
create policy "members record own product events" on public.product_events for insert to authenticated
  with check(user_id=auth.uid() and pg_column_size(properties)<=2048);

create table if not exists public.session_outcomes (
  proposal_id uuid not null references public.session_proposals(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  outcome text not null check(outcome in('happened','did_not_happen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(proposal_id,user_id)
);
alter table public.session_outcomes enable row level security;
create policy "participants see session outcomes" on public.session_outcomes for select to authenticated
  using(exists(
    select 1 from session_proposals p join conversations c on c.id=p.conversation_id
    join matches m on m.id=c.match_id where p.id=proposal_id and auth.uid() in(m.user_a,m.user_b)
  ));

create or replace function public.confirm_session_outcome(target_proposal_id uuid,outcome_value text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if outcome_value not in('happened','did_not_happen') then raise exception 'Invalid session outcome'; end if;
  if not exists(
    select 1 from session_proposals p join conversations c on c.id=p.conversation_id
    join matches m on m.id=c.match_id where p.id=target_proposal_id and p.status='accepted'
    and p.starts_at<now() and auth.uid() in(m.user_a,m.user_b)
  ) then raise exception 'Session is not ready for confirmation'; end if;
  insert into session_outcomes(proposal_id,user_id,outcome) values(target_proposal_id,auth.uid(),outcome_value)
  on conflict(proposal_id,user_id) do update set outcome=excluded.outcome,updated_at=now();
end $$;

-- Free members can run one focused search. Amplified members can recruit for up to three roles/projects.
create or replace function public.enforce_active_band_call_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare call_limit integer;
begin
  call_limit:=case when coalesce((select tier from subscription_status where user_id=new.creator_id),'free')='amplified' then 3 else 1 end;
  if (select count(*) from band_calls where creator_id=new.creator_id and active)>=call_limit then
    raise exception 'Active band call limit reached';
  end if;
  return new;
end $$;
drop trigger if exists active_band_call_limit on public.band_calls;
create trigger active_band_call_limit before insert on public.band_calls
for each row execute procedure public.enforce_active_band_call_limit();

drop function if exists public.conversation_proposals(uuid);
create function public.conversation_proposals(target_conversation_id uuid)
returns table(id uuid,conversation_id uuid,proposer_id uuid,kind text,starts_at timestamptz,general_location text,songs text[],status public.proposal_status,ready_count bigint,my_ready boolean,my_outcome text)
language sql stable security definer set search_path=public as $$
 select p.id,p.conversation_id,p.proposer_id,p.kind,p.starts_at,p.general_location,p.songs,p.status,
   count(distinct r.user_id) filter(where r.ready),coalesce(bool_or(r.user_id=auth.uid() and r.ready),false),
   max(o.outcome) filter(where o.user_id=auth.uid())
 from session_proposals p join conversations c on c.id=p.conversation_id join matches m on m.id=c.match_id
 left join session_readiness r on r.proposal_id=p.id left join session_outcomes o on o.proposal_id=p.id
 where p.conversation_id=target_conversation_id and auth.uid() in(m.user_a,m.user_b)
 group by p.id order by p.created_at desc;
$$;

revoke all on function public.confirm_session_outcome(uuid,text) from public;
grant execute on function public.confirm_session_outcome(uuid,text) to authenticated;
grant execute on function public.conversation_proposals(uuid) to authenticated;
