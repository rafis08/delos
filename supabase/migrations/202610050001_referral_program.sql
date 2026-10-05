-- Referral Program V1: server-owned attribution, qualification, reward audit trail, and admin tools.
create extension if not exists pgcrypto;

alter table public.product_events drop constraint if exists product_events_event_name_check;
alter table public.product_events add constraint product_events_event_name_check check(event_name in(
  'discovery_viewed','connection_sent','match_created','first_message_sent',
  'session_proposed','session_accepted','session_confirmed','premium_viewed','checkout_started',
  'referral_screen_viewed','referral_link_shared','referral_signup_started',
  'referral_signup_completed','referral_qualified','referral_reward_earned'
));

create table public.referral_codes (
  user_id uuid primary key references public.users(id) on delete cascade,
  code text not null unique check(code ~ '^[A-Z0-9]{8,16}$'),
  created_at timestamptz not null default now()
);

create table public.entitlement_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_type text not null check(source_type in('subscription','referral_reward','promotion','admin_grant')),
  source_id uuid,
  benefit text not null default 'delos_music_pro' check(benefit='delos_music_pro'),
  duration_days integer check(duration_days between 1 and 3660),
  status text not null default 'queued' check(status in('queued','active','redeemed','revoked')),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.users(id),
  check(jsonb_typeof(metadata)='object'),
  check((status<>'active') or (starts_at is not null and ends_at is not null and ends_at>starts_at))
);
create index entitlement_grants_user_status_idx on public.entitlement_grants(user_id,status,created_at);
create unique index entitlement_grants_source_unique on public.entitlement_grants(source_type,source_id)
  where source_id is not null and source_type='referral_reward';

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users(id) on delete cascade,
  -- Deliberately retained as an immutable UUID if the referred account is deleted. Keeping the
  -- tombstone plus install hash prevents delete/recreate cycles from earning another credit.
  referred_user_id uuid not null unique,
  referral_code text not null,
  status text not null default 'pending' check(status in('pending','qualified','rejected','rewarded')),
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  rejected_at timestamptz,
  rewarded_at timestamptz,
  reward_id uuid references public.entitlement_grants(id),
  install_fingerprint_hash text,
  risk_flags text[] not null default '{}',
  admin_note text,
  updated_at timestamptz not null default now(),
  check(referrer_user_id<>referred_user_id)
);
create index referrals_referrer_status_idx on public.referrals(referrer_user_id,status,created_at);
create index referrals_fingerprint_idx on public.referrals(install_fingerprint_hash) where install_fingerprint_hash is not null;

create table public.referral_admin_actions (
  id bigint generated always as identity primary key,
  referral_id uuid not null references public.referrals(id) on delete cascade,
  admin_user_id uuid not null references public.users(id),
  action text not null check(action in('grant','revoke','reject','note')),
  reason text not null check(char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.entitlement_grants enable row level security;
alter table public.referral_admin_actions enable row level security;

create policy "members read own referral code" on public.referral_codes for select to authenticated using(user_id=auth.uid());
create policy "members read their referral activity" on public.referrals for select to authenticated
  using(referrer_user_id=auth.uid() or referred_user_id=auth.uid());
create policy "members read own grants" on public.entitlement_grants for select to authenticated using(user_id=auth.uid());

create or replace function public.make_referral_code(target_user_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare candidate text;
begin
  loop
    candidate := upper(substr(replace(target_user_id::text,'-',''),1,6) || substr(md5(target_user_id::text || clock_timestamp()::text || random()::text),1,4));
    exit when not exists(select 1 from referral_codes where code=candidate);
  end loop;
  return candidate;
end $$;

create or replace function public.ensure_referral_code()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into referral_codes(user_id,code) values(new.id,make_referral_code(new.id)) on conflict(user_id) do nothing;
  return new;
end $$;
drop trigger if exists users_create_referral_code on public.users;
create trigger users_create_referral_code after insert on public.users for each row execute procedure public.ensure_referral_code();
insert into public.referral_codes(user_id,code)
select id, public.make_referral_code(id) from public.users on conflict(user_id) do nothing;

create or replace function public.capture_new_user_referral()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare normalized_code text; referrer uuid; fingerprint text; flags text[]:='{}';
begin
  normalized_code := upper(btrim(coalesce(new.raw_user_meta_data->>'referral_code','')));
  if normalized_code='' then return new; end if;
  select user_id into referrer from public.referral_codes where code=normalized_code;
  if referrer is null or referrer=new.id then return new; end if;
  fingerprint := case when nullif(new.raw_user_meta_data->>'referral_install_id','') is null then null
    else encode(digest(new.raw_user_meta_data->>'referral_install_id','sha256'),'hex') end;
  if fingerprint is not null and exists(select 1 from public.referrals where install_fingerprint_hash=fingerprint) then
    flags := array_append(flags,'repeated_install');
  end if;
  if (select count(*) from public.referrals where referrer_user_id=referrer and created_at>now()-interval '1 hour')>=5 then
    flags := array_append(flags,'high_velocity');
  end if;
  insert into public.referrals(referrer_user_id,referred_user_id,referral_code,install_fingerprint_hash,risk_flags)
  values(referrer,new.id,normalized_code,fingerprint,flags) on conflict(referred_user_id) do nothing;
  insert into public.product_events(user_id,event_name,properties)
    values(new.id,'referral_signup_started',jsonb_build_object('referral_code',normalized_code));
  return new;
end $$;
drop trigger if exists auth_capture_new_user_referral on auth.users;

-- Keep referral attribution in the existing auth lifecycle trigger so the public user row
-- always exists before foreign-keyed referral/event records are created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare normalized_code text; referrer uuid; fingerprint text; flags text[]:='{}';
begin
  insert into public.users(id,adult_attested_at)
    values(new.id,(new.raw_user_meta_data->>'adult_attested_at')::timestamptz) on conflict do nothing;
  insert into public.discovery_preferences(user_id) values(new.id) on conflict do nothing;
  insert into public.subscription_status(user_id) values(new.id) on conflict do nothing;
  normalized_code:=upper(btrim(coalesce(new.raw_user_meta_data->>'referral_code','')));
  if normalized_code<>'' then
    select user_id into referrer from public.referral_codes where code=normalized_code;
    if referrer is not null and referrer<>new.id then
      fingerprint:=case when nullif(new.raw_user_meta_data->>'referral_install_id','') is null then null
        else encode(digest(new.raw_user_meta_data->>'referral_install_id','sha256'),'hex') end;
      if fingerprint is not null and exists(select 1 from public.referrals where install_fingerprint_hash=fingerprint) then flags:=array_append(flags,'repeated_install'); end if;
      if (select count(*) from public.referrals where referrer_user_id=referrer and created_at>now()-interval '1 hour')>=5 then flags:=array_append(flags,'high_velocity'); end if;
      insert into public.referrals(referrer_user_id,referred_user_id,referral_code,install_fingerprint_hash,risk_flags)
        values(referrer,new.id,normalized_code,fingerprint,flags) on conflict(referred_user_id) do nothing;
      insert into public.product_events(user_id,event_name,properties)
        values(new.id,'referral_signup_started',jsonb_build_object('referral_code',normalized_code));
    end if;
  end if;
  return new;
end $$;

create or replace function public.activate_next_queued_grant(target_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare grant_id uuid; paid_active boolean; active_until timestamptz;
begin
  paid_active := exists(select 1 from subscription_status where user_id=target_user_id and tier='amplified' and (expires_at is null or expires_at>now()));
  active_until := (select max(ends_at) from entitlement_grants where user_id=target_user_id and status='active' and ends_at>now());
  if paid_active or active_until is not null then return; end if;
  select id into grant_id from entitlement_grants where user_id=target_user_id and status='queued' order by created_at limit 1 for update skip locked;
  if grant_id is not null then
    update entitlement_grants set status='active',starts_at=now(),ends_at=now()+make_interval(days=>duration_days),updated_at=now() where id=grant_id;
  end if;
end $$;

create or replace function public.award_referral_milestones(target_referrer uuid)
returns void language plpgsql security definer set search_path=public as $$
declare qualified_count integer; reward_count integer; milestone integer; reward uuid; referral uuid;
begin
  select count(*) into qualified_count from referrals where referrer_user_id=target_referrer and status in('qualified','rewarded');
  select count(*) into reward_count from entitlement_grants where user_id=target_referrer and source_type='referral_reward' and status<>'revoked';
  while qualified_count >= (reward_count+1)*5 loop
    milestone := (reward_count+1)*5;
    select id into referral from referrals where referrer_user_id=target_referrer and status in('qualified','rewarded') order by qualified_at limit 1 offset (milestone-1);
    insert into entitlement_grants(user_id,source_type,source_id,duration_days,metadata)
      values(target_referrer,'referral_reward',referral,30,jsonb_build_object('milestone',milestone,'qualified_referrals',qualified_count)) returning id into reward;
    update referrals set status='rewarded',reward_id=reward,rewarded_at=now(),updated_at=now() where id=referral;
    insert into product_events(user_id,event_name,properties) values(target_referrer,'referral_reward_earned',jsonb_build_object('reward_id',reward,'milestone',milestone));
    reward_count:=reward_count+1;
  end loop;
  perform activate_next_queued_grant(target_referrer);
end $$;

create or replace function public.qualify_my_referral()
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare item public.referrals%rowtype; complete boolean;
begin
  select * into item from referrals where referred_user_id=auth.uid() for update;
  if item.id is null or item.status<>'pending' then return false; end if;
  select exists(
    select 1 from musician_profiles p join auth.users a on a.id=p.user_id
    where p.user_id=auth.uid() and a.email_confirmed_at is not null
      and char_length(btrim(p.display_name))>=2 and p.age>=18 and char_length(btrim(p.bio))>=20
      and char_length(btrim(p.primary_instrument))>0 and cardinality(p.goals)>0
  ) into complete;
  if not complete then return false; end if;
  if 'repeated_install'=any(item.risk_flags) then return false; end if;
  update referrals set status='qualified',qualified_at=now(),updated_at=now() where id=item.id;
  insert into product_events(user_id,event_name,properties) values(auth.uid(),'referral_signup_completed',jsonb_build_object('referral_id',item.id));
  insert into product_events(user_id,event_name,properties) values(item.referrer_user_id,'referral_qualified',jsonb_build_object('referral_id',item.id));
  perform award_referral_milestones(item.referrer_user_id);
  return true;
end $$;

create or replace function public.my_referral_dashboard()
returns table(code text,qualified_count integer,pending_count integer,rejected_count integer,rewards_earned integer,rewards_queued integer,progress integer)
language sql security definer set search_path=public stable as $$
  select c.code,
    count(r.id) filter(where r.status in('qualified','rewarded'))::integer,
    count(r.id) filter(where r.status='pending')::integer,
    count(r.id) filter(where r.status='rejected')::integer,
    (select count(*)::integer from entitlement_grants g where g.user_id=auth.uid() and g.source_type='referral_reward' and g.status<>'revoked'),
    (select count(*)::integer from entitlement_grants g where g.user_id=auth.uid() and g.source_type='referral_reward' and g.status='queued'),
    (count(r.id) filter(where r.status in('qualified','rewarded'))::integer % 5)
  from referral_codes c left join referrals r on r.referrer_user_id=c.user_id where c.user_id=auth.uid() group by c.code;
$$;

create or replace function public.referral_admin_dashboard()
returns table(referral_id uuid,referrer_user_id uuid,referrer_name text,referred_user_id uuid,referred_name text,status text,created_at timestamptz,qualified_at timestamptz,reward_id uuid,risk_flags text[],rewards_earned bigint,rewards_redeemed bigint)
language sql security definer set search_path=public stable as $$
  select r.id,r.referrer_user_id,coalesce(rp.display_name,'Member'),r.referred_user_id,coalesce(np.display_name,'Pending profile'),r.status,r.created_at,r.qualified_at,r.reward_id,r.risk_flags,
    (select count(*) from entitlement_grants g where g.user_id=r.referrer_user_id and g.source_type='referral_reward' and g.status<>'revoked'),
    (select count(*) from entitlement_grants g where g.user_id=r.referrer_user_id and g.source_type='referral_reward' and g.status='redeemed')
  from referrals r left join musician_profiles rp on rp.user_id=r.referrer_user_id left join musician_profiles np on np.user_id=r.referred_user_id
  where exists(select 1 from users u where u.id=auth.uid() and u.role in('moderator','admin')) order by r.created_at desc;
$$;

create or replace function public.admin_update_referral(target_referral_id uuid,requested_action text,reason text)
returns void language plpgsql security definer set search_path=public as $$
declare item referrals%rowtype;
begin
  if not exists(select 1 from users where id=auth.uid() and role in('moderator','admin')) then raise exception 'Not authorized'; end if;
  if requested_action not in('grant','revoke','reject','note') or char_length(btrim(reason))<3 then raise exception 'Invalid action'; end if;
  select * into item from referrals where id=target_referral_id for update;
  if item.id is null then raise exception 'Referral not found'; end if;
  insert into referral_admin_actions(referral_id,admin_user_id,action,reason) values(item.id,auth.uid(),requested_action,btrim(reason));
  if requested_action='grant' and item.status='pending' then
    update referrals set status='qualified',qualified_at=now(),admin_note=reason,updated_at=now() where id=item.id;
    perform award_referral_milestones(item.referrer_user_id);
  elsif requested_action='reject' then
    update referrals set status='rejected',rejected_at=now(),admin_note=reason,updated_at=now() where id=item.id;
  elsif requested_action='revoke' then
    update entitlement_grants set status='revoked',revoked_at=now(),revoked_by=auth.uid(),updated_at=now() where id=item.reward_id and status<>'redeemed';
    update referrals set status='rejected',admin_note=reason,updated_at=now() where id=item.id;
  else update referrals set admin_note=reason,updated_at=now() where id=item.id;
  end if;
end $$;

create or replace function public.has_delos_music_pro(target_user_id uuid default auth.uid())
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if target_user_id=auth.uid() then perform activate_next_queued_grant(target_user_id); end if;
  return exists(select 1 from subscription_status where user_id=target_user_id and tier='amplified' and (expires_at is null or expires_at>now()))
    or exists(select 1 from entitlement_grants where user_id=target_user_id and status='active' and starts_at<=now() and ends_at>now());
end;
$$;

create or replace function public.my_like_allowance()
returns table(tier text,used_count integer,daily_limit integer,remaining_count integer)
language plpgsql security definer set search_path=public as $$
declare premium boolean; used integer;
begin
  premium:=has_delos_music_pro(auth.uid());
  select count(*)::integer into used from likes where actor_id=auth.uid() and created_at>=date_trunc('day',now() at time zone 'utc');
  return query select case when premium then 'amplified' else 'free' end,used,
    case when premium then null::integer else 15 end,
    case when premium then null::integer else greatest(0,15-used) end;
end $$;

create or replace function public.profiles_who_liked_me()
returns table(profile_id uuid,liked_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
  if not has_delos_music_pro(auth.uid()) then raise exception 'Premium membership required'; end if;
  return query select l.actor_id,l.created_at from likes l where l.target_id=auth.uid()
    and not exists(select 1 from likes mine where mine.actor_id=auth.uid() and mine.target_id=l.actor_id)
    and not exists(select 1 from blocks b where (b.blocker_id=auth.uid() and b.blocked_id=l.actor_id) or (b.blocker_id=l.actor_id and b.blocked_id=auth.uid()))
    order by l.created_at desc;
end $$;

create or replace function public.rewind_last_pass()
returns uuid language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
  if not has_delos_music_pro(auth.uid()) then raise exception 'Premium membership required'; end if;
  select target_id into target from passes where actor_id=auth.uid() order by created_at desc limit 1;
  if target is not null then delete from passes where actor_id=auth.uid() and target_id=target; end if;
  return target;
end $$;

create or replace function public.activate_profile_boost()
returns timestamptz language plpgsql security definer set search_path=public as $$
declare result timestamptz:=now()+interval '24 hours';
begin
  if not has_delos_music_pro(auth.uid()) then raise exception 'Premium membership required'; end if;
  if exists(select 1 from musician_profiles where user_id=auth.uid() and last_boosted_at>now()-interval '7 days') then raise exception 'Your next weekly boost is not ready yet'; end if;
  update musician_profiles set boosted_until=result,last_boosted_at=now() where user_id=auth.uid();
  return result;
end $$;

create or replace function public.enforce_media_entitlement()
returns trigger language plpgsql security definer set search_path=public as $$
declare media_limit integer;
begin
  media_limit:=case when has_delos_music_pro(new.profile_id) then 10 else 3 end;
  if (select count(*) from media_samples where profile_id=new.profile_id)>=media_limit then raise exception 'Media limit reached. Remove a sample or upgrade to Premium.'; end if;
  return new;
end $$;

revoke all on function public.my_referral_dashboard(),public.qualify_my_referral(),public.referral_admin_dashboard(),public.admin_update_referral(uuid,text,text),public.has_delos_music_pro(uuid) from public;
grant execute on function public.my_referral_dashboard(),public.qualify_my_referral(),public.referral_admin_dashboard(),public.admin_update_referral(uuid,text,text),public.has_delos_music_pro(uuid) to authenticated;
