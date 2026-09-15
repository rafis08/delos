create table public.band_call_applications (
  id uuid primary key default gen_random_uuid(), band_call_id uuid not null references public.band_calls(id) on delete cascade,
  applicant_id uuid not null references public.users(id) on delete cascade, intro text not null check(char_length(intro) between 10 and 500),
  status text not null default 'pending' check(status in('pending','invited','declined')), created_at timestamptz not null default now(), responded_at timestamptz,
  unique(band_call_id,applicant_id)
);
alter table public.band_call_applications enable row level security;
create policy "application participants read" on public.band_call_applications for select to authenticated using(applicant_id=auth.uid() or exists(select 1 from band_calls b where b.id=band_call_id and b.creator_id=auth.uid()));

create table public.session_readiness (
  proposal_id uuid not null references public.session_proposals(id) on delete cascade, user_id uuid not null references public.users(id) on delete cascade,
  ready boolean not null default true, updated_at timestamptz not null default now(), primary key(proposal_id,user_id)
);
alter table public.session_readiness enable row level security;
create policy "session participants manage readiness" on public.session_readiness for all to authenticated
using(user_id=auth.uid() and exists(select 1 from session_proposals p join conversations c on c.id=p.conversation_id join matches m on m.id=c.match_id where p.id=proposal_id and auth.uid() in(m.user_a,m.user_b)))
with check(user_id=auth.uid() and exists(select 1 from session_proposals p join conversations c on c.id=p.conversation_id join matches m on m.id=c.match_id where p.id=proposal_id and auth.uid() in(m.user_a,m.user_b)));

create or replace function public.apply_to_band_call(target_band_call_id uuid,application_intro text)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; owner_id uuid;
begin
 select creator_id into owner_id from band_calls where id=target_band_call_id and active;
 if owner_id is null or owner_id=auth.uid() or char_length(btrim(application_intro)) not between 10 and 500 then raise exception 'Invalid application'; end if;
 insert into band_call_applications(band_call_id,applicant_id,intro) values(target_band_call_id,auth.uid(),btrim(application_intro))
 on conflict(band_call_id,applicant_id) do update set intro=excluded.intro,status='pending',responded_at=null returning id into result;
 insert into notifications(user_id,kind,title,body) values(owner_id,'message','New band call response','A musician is interested in your project.'); return result;
end $$;

create or replace function public.band_call_applicants(target_band_call_id uuid)
returns table(id uuid,band_call_id uuid,applicant_id uuid,applicant_name text,primary_instrument text,intro text,status text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select a.id,a.band_call_id,a.applicant_id,p.display_name,p.primary_instrument,a.intro,a.status,a.created_at from band_call_applications a join band_calls b on b.id=a.band_call_id join musician_profiles p on p.user_id=a.applicant_id where a.band_call_id=target_band_call_id and b.creator_id=auth.uid() order by a.created_at desc;
$$;

create or replace function public.respond_to_band_call_application(application_id uuid,response text)
returns uuid language plpgsql security definer set search_path=public as $$
declare application band_call_applications; owner_id uuid; low_id uuid; high_id uuid; matched_id uuid; conversation_id uuid;
begin
 if response not in('invited','declined') then raise exception 'Invalid response'; end if;
 select a.* into application from band_call_applications a join band_calls b on b.id=a.band_call_id where a.id=application_id and b.creator_id=auth.uid();
 if application.id is null then raise exception 'Application unavailable'; end if;
 update band_call_applications set status=response,responded_at=now() where id=application_id;
 select creator_id into owner_id from band_calls where id=application.band_call_id;
 if response='invited' then
   low_id:=least(owner_id,application.applicant_id);high_id:=greatest(owner_id,application.applicant_id);
   insert into matches(user_a,user_b) values(low_id,high_id) on conflict(user_a,user_b) do update set user_a=excluded.user_a returning id into matched_id;
   insert into conversations(match_id) values(matched_id) on conflict(match_id) do update set match_id=excluded.match_id returning id into conversation_id;
 end if;
 insert into notifications(user_id,kind,title,body) values(application.applicant_id,case when response='invited' then 'match' else 'message' end,case when response='invited' then 'You’re invited' else 'Band call update' end,case when response='invited' then 'The project owner opened a conversation with you.' else 'The project is moving in another direction.' end);
 return conversation_id;
end $$;

create or replace function public.set_session_ready(target_proposal_id uuid,is_ready boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from session_proposals p join conversations c on c.id=p.conversation_id join matches m on m.id=c.match_id where p.id=target_proposal_id and p.status='accepted' and auth.uid() in(m.user_a,m.user_b)) then raise exception 'Session unavailable'; end if;
 insert into session_readiness(proposal_id,user_id,ready) values(target_proposal_id,auth.uid(),is_ready) on conflict(proposal_id,user_id) do update set ready=excluded.ready,updated_at=now();
end $$;

create or replace function public.conversation_proposals(target_conversation_id uuid)
returns table(id uuid,conversation_id uuid,proposer_id uuid,kind text,starts_at timestamptz,general_location text,songs text[],status public.proposal_status,ready_count bigint,my_ready boolean)
language sql stable security definer set search_path=public as $$
 select p.id,p.conversation_id,p.proposer_id,p.kind,p.starts_at,p.general_location,p.songs,p.status,count(r.user_id) filter(where r.ready),coalesce(bool_or(r.user_id=auth.uid() and r.ready),false)
 from session_proposals p join conversations c on c.id=p.conversation_id join matches m on m.id=c.match_id left join session_readiness r on r.proposal_id=p.id
 where p.conversation_id=target_conversation_id and auth.uid() in(m.user_a,m.user_b) group by p.id order by p.created_at desc;
$$;

revoke all on function public.apply_to_band_call(uuid,text),public.band_call_applicants(uuid),public.respond_to_band_call_application(uuid,text),public.set_session_ready(uuid,boolean),public.conversation_proposals(uuid) from public;
grant execute on function public.apply_to_band_call(uuid,text),public.band_call_applicants(uuid),public.respond_to_band_call_application(uuid,text),public.set_session_ready(uuid,boolean),public.conversation_proposals(uuid) to authenticated;
