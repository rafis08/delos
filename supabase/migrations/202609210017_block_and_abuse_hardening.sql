-- Close remaining blocked-user write/read paths and add abuse-resistant RPC validation.

drop policy if exists "session participants manage readiness" on public.session_readiness;
create policy "unblocked participants manage readiness" on public.session_readiness
for all to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.session_proposals p
    where p.id = proposal_id and public.can_access_conversation(p.conversation_id)
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.session_proposals p
    where p.id = proposal_id and public.can_access_conversation(p.conversation_id)
  )
);

drop policy if exists "participants see session outcomes" on public.session_outcomes;
create policy "unblocked participants see session outcomes" on public.session_outcomes
for select to authenticated using (
  exists (
    select 1 from public.session_proposals p
    where p.id = proposal_id and public.can_access_conversation(p.conversation_id)
  )
);

create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.can_access_conversation(target_conversation_id) is not true then
    raise exception 'Conversation unavailable';
  end if;
  update messages set read_at = now()
  where conversation_id = target_conversation_id
    and sender_id <> auth.uid() and read_at is null;
end;
$$;

create or replace function public.set_session_ready(target_proposal_id uuid, is_ready boolean)
returns void language plpgsql security definer set search_path = public as $$
declare target_conversation_id uuid;
begin
  select p.conversation_id into target_conversation_id
  from session_proposals p
  where p.id = target_proposal_id and p.status = 'accepted';
  if target_conversation_id is null
     or public.can_access_conversation(target_conversation_id) is not true then
    raise exception 'Session unavailable';
  end if;
  insert into session_readiness(proposal_id,user_id,ready)
  values(target_proposal_id,auth.uid(),is_ready)
  on conflict(proposal_id,user_id)
  do update set ready = excluded.ready, updated_at = now();
end;
$$;

create or replace function public.confirm_session_outcome(
  target_proposal_id uuid,
  outcome_value text
)
returns void language plpgsql security definer set search_path = public as $$
declare target_conversation_id uuid;
begin
  if outcome_value not in ('happened','did_not_happen') then
    raise exception 'Invalid session outcome';
  end if;
  select p.conversation_id into target_conversation_id
  from session_proposals p
  where p.id = target_proposal_id and p.status = 'accepted' and p.starts_at < now();
  if target_conversation_id is null
     or public.can_access_conversation(target_conversation_id) is not true then
    raise exception 'Session is not ready for confirmation';
  end if;
  insert into session_outcomes(proposal_id,user_id,outcome)
  values(target_proposal_id,auth.uid(),outcome_value)
  on conflict(proposal_id,user_id)
  do update set outcome = excluded.outcome, updated_at = now();
end;
$$;

drop function if exists public.conversation_proposals(uuid);
create function public.conversation_proposals(target_conversation_id uuid)
returns table(
  id uuid, conversation_id uuid, proposer_id uuid, kind text, starts_at timestamptz,
  general_location text, songs text[], status public.proposal_status,
  ready_count bigint, my_ready boolean, my_outcome text
)
language sql stable security definer set search_path = public as $$
  select p.id,p.conversation_id,p.proposer_id,p.kind,p.starts_at,p.general_location,
    p.songs,p.status,count(distinct r.user_id) filter(where r.ready),
    coalesce(bool_or(r.user_id = auth.uid() and r.ready),false),
    max(o.outcome) filter(where o.user_id = auth.uid())
  from session_proposals p
  left join session_readiness r on r.proposal_id = p.id
  left join session_outcomes o on o.proposal_id = p.id
  where p.conversation_id = target_conversation_id
    and public.can_access_conversation(target_conversation_id)
  group by p.id order by p.created_at desc;
$$;

-- Applications cannot be created or acted on after either party blocks the other.
create or replace function public.apply_to_band_call(
  target_band_call_id uuid,
  application_intro text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare result uuid; owner_id uuid; actor uuid := auth.uid();
begin
  select creator_id into owner_id from band_calls
  where id = target_band_call_id and active;
  if actor is null or owner_id is null or owner_id = actor
     or public.is_blocked(owner_id)
     or char_length(btrim(application_intro)) not between 10 and 500 then
    raise exception 'Application unavailable';
  end if;
  if (select count(*) from band_call_applications
      where applicant_id = actor and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Application limit reached. Try again later';
  end if;
  insert into band_call_applications(band_call_id,applicant_id,intro)
  values(target_band_call_id,actor,btrim(application_intro))
  on conflict(band_call_id,applicant_id)
  do update set intro = excluded.intro,status = 'pending',responded_at = null
  returning id into result;
  insert into notifications(user_id,kind,title,body)
  values(owner_id,'message','New band call response','A musician is interested in your project.');
  return result;
end;
$$;

-- Reports use bounded normalized input and require an existing target.
create or replace function public.submit_report_rate_limited(
  target_user_id uuid,
  report_reason text,
  report_details text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare result uuid; actor uuid := auth.uid();
begin
  report_reason := btrim(report_reason);
  report_details := btrim(coalesce(report_details,''));
  if actor is null or actor = target_user_id
     or not exists(select 1 from users where id = target_user_id)
     or char_length(report_reason) not between 2 and 80
     or char_length(report_details) > 1000 then
    raise exception 'Invalid report';
  end if;
  if (select count(*) from reports
      where reporter_id = actor and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Report limit reached. Try again later';
  end if;
  insert into reports(reporter_id,reported_id,reason,details)
  values(actor,target_user_id,report_reason,report_details)
  returning id into result;
  return result;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
revoke all on function public.set_session_ready(uuid,boolean) from public;
revoke all on function public.confirm_session_outcome(uuid,text) from public;
revoke all on function public.conversation_proposals(uuid) from public;
revoke all on function public.apply_to_band_call(uuid,text) from public;
revoke all on function public.submit_report_rate_limited(uuid,text,text) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.set_session_ready(uuid,boolean) to authenticated;
grant execute on function public.confirm_session_outcome(uuid,text) to authenticated;
grant execute on function public.conversation_proposals(uuid) to authenticated;
grant execute on function public.apply_to_band_call(uuid,text) to authenticated;
grant execute on function public.submit_report_rate_limited(uuid,text,text) to authenticated;
