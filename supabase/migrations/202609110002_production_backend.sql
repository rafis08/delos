-- Production auth lifecycle and security-sensitive operations for the Delos client.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users(id) values(new.id) on conflict do nothing;
  insert into public.discovery_preferences(user_id) values(new.id) on conflict do nothing;
  insert into public.subscription_status(user_id) values(new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.users(id) select id from auth.users on conflict do nothing;
insert into public.discovery_preferences(user_id) select id from auth.users on conflict do nothing;
insert into public.subscription_status(user_id) select id from auth.users on conflict do nothing;

create or replace function public.is_blocked(other_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from blocks where
    (blocker_id=auth.uid() and blocked_id=other_user_id) or
    (blocker_id=other_user_id and blocked_id=auth.uid()));
$$;
revoke all on function public.is_blocked(uuid) from public;
grant execute on function public.is_blocked(uuid) to authenticated;

drop policy if exists "profiles visible to members" on public.musician_profiles;
create policy "profiles visible to unblocked members" on public.musician_profiles for select to authenticated using (
  (discovery_visible or user_id=auth.uid()) and not public.is_blocked(user_id)
);

create or replace function public.create_like_and_match(target_user_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid := auth.uid(); low_id uuid; high_id uuid; matched_id uuid;
begin
  if actor is null or actor=target_user_id then raise exception 'Invalid like'; end if;
  if not exists(select 1 from users where id=target_user_id) then raise exception 'Member not found'; end if;
  if exists(select 1 from blocks where (blocker_id=actor and blocked_id=target_user_id) or (blocker_id=target_user_id and blocked_id=actor)) then raise exception 'Interaction unavailable'; end if;
  insert into likes(actor_id,target_id) values(actor,target_user_id) on conflict do nothing;
  delete from passes where actor_id=actor and target_id=target_user_id;
  if not exists(select 1 from likes where actor_id=target_user_id and target_id=actor) then return null; end if;
  low_id := least(actor,target_user_id); high_id := greatest(actor,target_user_id);
  insert into matches(user_a,user_b) values(low_id,high_id)
    on conflict(user_a,user_b) do update set user_a=excluded.user_a returning id into matched_id;
  insert into conversations(match_id) values(matched_id) on conflict(match_id) do nothing;
  insert into notifications(user_id,kind,title,body) values
    (actor,'match','It’s a match','You can start a conversation now.'),
    (target_user_id,'match','It’s a match','You can start a conversation now.');
  return matched_id;
end $$;

create or replace function public.record_pass(target_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid := auth.uid();
begin
  if actor is null or actor=target_user_id then raise exception 'Invalid pass'; end if;
  insert into passes(actor_id,target_id) values(actor,target_user_id) on conflict do nothing;
end $$;

create or replace function public.my_conversations()
returns table(id uuid, profile_id uuid, display_name text, last_message text, updated_at timestamptz, unread bigint)
language sql stable security definer set search_path=public as $$
  select c.id,
    case when m.user_a=auth.uid() then m.user_b else m.user_a end,
    p.display_name,
    coalesce(last_msg.body,''),
    coalesce(last_msg.created_at,c.created_at),
    count(unread_msg.id)
  from conversations c
  join matches m on m.id=c.match_id and auth.uid() in (m.user_a,m.user_b)
  join musician_profiles p on p.user_id=case when m.user_a=auth.uid() then m.user_b else m.user_a end
  left join lateral (select body,created_at from messages where conversation_id=c.id order by created_at desc limit 1) last_msg on true
  left join messages unread_msg on unread_msg.conversation_id=c.id and unread_msg.sender_id<>auth.uid() and unread_msg.read_at is null
  where not exists(select 1 from blocks b where (b.blocker_id=m.user_a and b.blocked_id=m.user_b) or (b.blocker_id=m.user_b and b.blocked_id=m.user_a))
  group by c.id,m.user_a,m.user_b,p.display_name,last_msg.body,last_msg.created_at,c.created_at
  order by coalesce(last_msg.created_at,c.created_at) desc;
$$;

create or replace function public.send_message_rate_limited(target_conversation_id uuid, message_body text)
returns public.messages language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); result public.messages; recipient uuid;
begin
  message_body:=btrim(message_body);
  if char_length(message_body) not between 1 and 2000 then raise exception 'Message must contain 1–2000 characters'; end if;
  select case when m.user_a=actor then m.user_b else m.user_a end into recipient
  from conversations c join matches m on m.id=c.match_id
  where c.id=target_conversation_id and actor in (m.user_a,m.user_b);
  if recipient is null then raise exception 'Conversation unavailable'; end if;
  if exists(select 1 from blocks where (blocker_id=actor and blocked_id=recipient) or (blocker_id=recipient and blocked_id=actor)) then raise exception 'Conversation unavailable'; end if;
  if (select count(*) from messages where sender_id=actor and created_at>now()-interval '10 seconds')>=5 then raise exception 'You’re sending too quickly. Try again shortly.'; end if;
  insert into messages(conversation_id,sender_id,body) values(target_conversation_id,actor,message_body) returning * into result;
  insert into notifications(user_id,kind,title,body) values(recipient,'message','New message',left(message_body,120));
  return result;
end $$;

create or replace function public.create_session_proposal(target_conversation_id uuid, proposal_kind text, proposal_starts_at timestamptz, proposal_location text, proposal_songs text[])
returns public.session_proposals language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); result public.session_proposals; recipient uuid;
begin
  if proposal_kind not in ('Rehearsal','Audition') or cardinality(proposal_songs)<>3 or char_length(btrim(proposal_location))<2 then raise exception 'Invalid proposal'; end if;
  select case when m.user_a=actor then m.user_b else m.user_a end into recipient from conversations c join matches m on m.id=c.match_id where c.id=target_conversation_id and actor in(m.user_a,m.user_b);
  if recipient is null then raise exception 'Conversation unavailable'; end if;
  insert into session_proposals(conversation_id,proposer_id,kind,starts_at,general_location,songs) values(target_conversation_id,actor,proposal_kind,proposal_starts_at,btrim(proposal_location),proposal_songs) returning * into result;
  insert into notifications(user_id,kind,title,body) values(recipient,'session','New session proposal',proposal_kind||' proposed for '||proposal_starts_at::date);
  return result;
end $$;

create policy "participants respond to proposals" on public.session_proposals for update to authenticated
using(exists(select 1 from conversations c join matches m on m.id=c.match_id where c.id=conversation_id and auth.uid() in(m.user_a,m.user_b)))
with check(exists(select 1 from conversations c join matches m on m.id=c.match_id where c.id=conversation_id and auth.uid() in(m.user_a,m.user_b)));

create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path=public,auth,storage as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Not authenticated'; end if;
  delete from storage.objects where bucket_id='profile-media' and (storage.foldername(name))[1]=actor::text;
  delete from auth.users where id=actor;
end $$;

revoke all on function public.create_like_and_match(uuid), public.record_pass(uuid), public.my_conversations(), public.send_message_rate_limited(uuid,text), public.create_session_proposal(uuid,text,timestamptz,text,text[]), public.delete_own_account() from public;
grant execute on function public.create_like_and_match(uuid), public.record_pass(uuid), public.my_conversations(), public.send_message_rate_limited(uuid,text), public.create_session_proposal(uuid,text,timestamptz,text,text[]), public.delete_own_account() to authenticated;
