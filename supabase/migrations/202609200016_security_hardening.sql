-- Fail-closed authorization hardening. Apply after 202609170015.

-- A member must never be able to promote their own public.users row.
drop policy if exists "own user row" on public.users;
create policy "members read own user row" on public.users
for select to authenticated using (id = auth.uid());
revoke insert, update, delete on public.users from authenticated;

-- Sensitive writes must use the validating/rate-limited SECURITY DEFINER RPCs.
drop policy if exists "own likes insert" on public.likes;
drop policy if exists "own passes" on public.passes;
create policy "members read own passes" on public.passes
for select to authenticated using (actor_id = auth.uid());
drop policy if exists "participant messages insert" on public.messages;
drop policy if exists "proposer inserts" on public.session_proposals;
drop policy if exists "participants respond to proposals" on public.session_proposals;
drop policy if exists "own reports insert" on public.reports;

-- Blocking is enforced at the database boundary, including already-known UUIDs.
create or replace function public.can_access_conversation(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from conversations c
    join matches m on m.id = c.match_id
    where c.id = target_conversation_id
      and auth.uid() in (m.user_a, m.user_b)
      and not exists (
        select 1 from blocks b
        where (b.blocker_id = m.user_a and b.blocked_id = m.user_b)
           or (b.blocker_id = m.user_b and b.blocked_id = m.user_a)
      )
  );
$$;
revoke all on function public.can_access_conversation(uuid) from public;
grant execute on function public.can_access_conversation(uuid) to authenticated;

drop policy if exists "participant conversations" on public.conversations;
create policy "unblocked participants read conversations" on public.conversations
for select to authenticated using (public.can_access_conversation(id));

drop policy if exists "participant messages read" on public.messages;
create policy "unblocked participants read messages" on public.messages
for select to authenticated using (public.can_access_conversation(conversation_id));

drop policy if exists "participant proposals" on public.session_proposals;
create policy "unblocked participants read proposals" on public.session_proposals
for select to authenticated using (public.can_access_conversation(conversation_id));

drop policy if exists "conversation members read room" on public.collaboration_items;
drop policy if exists "conversation members add room items" on public.collaboration_items;
drop policy if exists "conversation members update room items" on public.collaboration_items;
drop policy if exists "conversation members delete room items" on public.collaboration_items;
create policy "unblocked members read room" on public.collaboration_items
for select to authenticated using (public.can_access_conversation(conversation_id));
create policy "unblocked members add room items" on public.collaboration_items
for insert to authenticated with check (
  created_by = auth.uid() and public.can_access_conversation(conversation_id)
);
create policy "unblocked members update room items" on public.collaboration_items
for update to authenticated using (public.can_access_conversation(conversation_id))
with check (public.can_access_conversation(conversation_id));
create policy "unblocked members delete room items" on public.collaboration_items
for delete to authenticated using (public.can_access_conversation(conversation_id));

-- Exact storage paths are not an authorization capability.
drop policy if exists "members read profile media" on storage.objects;
create policy "authorized members read profile media" on storage.objects
for select to authenticated using (
  bucket_id = 'profile-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.media_samples ms
      join public.musician_profiles p on p.user_id = ms.profile_id
      where ms.storage_path = name
        and p.discovery_visible
        and not public.is_blocked(p.user_id)
    )
  )
);

drop policy if exists "users upload own media" on storage.objects;
create policy "users upload validated own media" on storage.objects
for insert to authenticated with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and coalesce(metadata->>'mimetype', '') in (
    'image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/x-m4a',
    'audio/aac','audio/wav','audio/webm','audio/ogg','video/mp4','video/quicktime'
  )
  and coalesce(metadata->>'size', '') ~ '^[0-9]+$'
  and (metadata->>'size')::bigint <= case
    when metadata->>'mimetype' like 'image/%' then 10000000
    when metadata->>'mimetype' like 'audio/%' then 25000000
    else 100000000
  end
);

-- Prevent owner-editable profile rows from spoofing server-controlled state.
create or replace function public.protect_musician_profile_system_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.user_id is distinct from old.user_id
       or new.verified_email is distinct from old.verified_email
       or new.boosted_until is distinct from old.boosted_until
       or new.last_boosted_at is distinct from old.last_boosted_at then
      raise exception 'Server-managed profile fields cannot be changed';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_musician_profile_system_fields on public.musician_profiles;
create trigger protect_musician_profile_system_fields
before update on public.musician_profiles for each row
execute function public.protect_musician_profile_system_fields();

-- Tighten grants in addition to RLS so direct REST writes cannot bypass RPC rules.
revoke insert, update, delete on public.likes from authenticated;
revoke insert, update, delete on public.passes from authenticated;
revoke insert, update, delete on public.messages from authenticated;
revoke insert, update, delete on public.session_proposals from authenticated;
revoke insert, update, delete on public.reports from authenticated;

-- Replace proposal RPCs so a known proposal/conversation UUID cannot bypass a block.
create or replace function public.create_session_proposal(
  target_conversation_id uuid,
  proposal_kind text,
  proposal_starts_at timestamptz,
  proposal_location text,
  proposal_songs text[]
)
returns public.session_proposals language plpgsql security definer set search_path = public as $$
declare actor uuid := auth.uid(); result public.session_proposals; recipient uuid;
begin
  if actor is null
     or not public.can_access_conversation(target_conversation_id)
     or proposal_kind not in ('Rehearsal','Audition')
     or proposal_starts_at <= now()
     or cardinality(proposal_songs) <> 3
     or char_length(btrim(proposal_location)) not between 2 and 120
  then raise exception 'Proposal unavailable'; end if;
  select case when m.user_a = actor then m.user_b else m.user_a end into recipient
  from conversations c join matches m on m.id = c.match_id
  where c.id = target_conversation_id and actor in (m.user_a,m.user_b);
  insert into session_proposals(conversation_id,proposer_id,kind,starts_at,general_location,songs)
  values(target_conversation_id,actor,proposal_kind,proposal_starts_at,btrim(proposal_location),proposal_songs)
  returning * into result;
  insert into notifications(user_id,kind,title,body)
  values(recipient,'session','New session proposal',proposal_kind || ' proposed for ' || proposal_starts_at::date);
  return result;
end;
$$;

create or replace function public.respond_to_proposal(
  proposal_id uuid,
  response public.proposal_status
)
returns public.session_proposals language plpgsql security definer set search_path = public as $$
declare result public.session_proposals;
begin
  if response not in ('accepted','declined') then raise exception 'Invalid response'; end if;
  update session_proposals p set status = response, responded_at = now()
  where p.id = proposal_id
    and p.status = 'pending'
    and p.proposer_id <> auth.uid()
    and public.can_access_conversation(p.conversation_id)
  returning * into result;
  if result.id is null then raise exception 'Proposal unavailable'; end if;
  return result;
end;
$$;

revoke all on function public.create_session_proposal(uuid,text,timestamptz,text,text[]) from public;
revoke all on function public.respond_to_proposal(uuid,public.proposal_status) from public;
grant execute on function public.create_session_proposal(uuid,text,timestamptz,text,text[]) to authenticated;
grant execute on function public.respond_to_proposal(uuid,public.proposal_status) to authenticated;
