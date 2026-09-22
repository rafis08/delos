-- Beta support operations, accountable moderation, and privacy/data-rights controls.

alter table public.users add column if not exists account_status text not null default 'active'
  check (account_status in ('active','suspended','banned'));
alter table public.users add column if not exists status_reason text;
alter table public.users add column if not exists status_expires_at timestamptz;
alter table public.users add column if not exists adult_attested_at timestamptz;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users(id,adult_attested_at)
  values(new.id,(new.raw_user_meta_data->>'adult_attested_at')::timestamptz) on conflict do nothing;
  insert into public.discovery_preferences(user_id) values(new.id) on conflict do nothing;
  insert into public.subscription_status(user_id) values(new.id) on conflict do nothing;
  return new;
end $$;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reference text unique not null,
  category text not null check(category in ('Account','Safety','Billing','Technical','Feedback')),
  subject text not null check(char_length(subject) between 5 and 120),
  description text not null check(char_length(description) between 20 and 3000),
  diagnostics jsonb not null default '{}',
  status text not null default 'open' check(status in ('open','in_progress','waiting_on_user','resolved')),
  priority text not null default 'normal' check(priority in ('normal','high','urgent')),
  escalated_to_development_at timestamptz,
  assigned_to uuid references public.users(id) on delete set null,
  resolution_notes text check(char_length(resolution_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_user_created_idx on public.support_tickets(user_id,created_at desc);
create index if not exists support_tickets_queue_idx on public.support_tickets(status,priority,created_at);
alter table public.support_tickets enable row level security;
drop policy if exists "members read own support tickets" on public.support_tickets;
create policy "members read own support tickets" on public.support_tickets for select to authenticated
  using(user_id = auth.uid());

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.users(id),
  target_user_id uuid references public.users(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  action text not null check(action in ('note','warning','suspend','ban','restore','dismiss')),
  notes text not null default '' check(char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists moderation_actions_target_idx on public.moderation_actions(target_user_id,created_at desc);
alter table public.moderation_actions enable row level security;

create or replace function public.require_active_member_write()
returns trigger language plpgsql security definer set search_path=public as $$
declare status text;
begin
  if auth.uid() is null then return new; end if;
  select account_status into status from users where id=auth.uid();
  if status <> 'active' then raise exception 'This account cannot create or change member content'; end if;
  return new;
end; $$;

do $$ declare table_name text;
begin
  foreach table_name in array array['likes','passes','messages','session_proposals','band_calls','band_call_applications','collaboration_items'] loop
    execute format('drop trigger if exists active_member_write on public.%I',table_name);
    execute format('create trigger active_member_write before insert or update on public.%I for each row execute function public.require_active_member_write()',table_name);
  end loop;
end $$;

create or replace function public.create_support_ticket(
  ticket_category text, ticket_subject text, ticket_description text, ticket_diagnostics jsonb default '{}'
) returns setof public.support_tickets
language plpgsql security definer set search_path = public as $$
declare actor uuid := auth.uid(); result public.support_tickets;
begin
  ticket_subject := btrim(ticket_subject);
  ticket_description := btrim(ticket_description);
  if actor is null or ticket_category not in ('Account','Safety','Billing','Technical','Feedback')
     or char_length(ticket_subject) not between 5 and 120
     or char_length(ticket_description) not between 20 and 3000
     or (select count(*) from jsonb_object_keys(coalesce(ticket_diagnostics,'{}'::jsonb))) > 10 then
    raise exception 'Invalid support request';
  end if;
  if (select count(*) from support_tickets where user_id=actor and created_at > now()-interval '1 hour') >= 5 then
    raise exception 'Support request limit reached. Try again later';
  end if;
  insert into support_tickets(user_id,reference,category,subject,description,diagnostics,priority)
  values(actor,'DELOS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),ticket_category,
    ticket_subject,ticket_description,coalesce(ticket_diagnostics,'{}'),
    case when ticket_category='Safety' then 'urgent' else 'normal' end)
  returning * into result;
  return next result;
end; $$;

create or replace function public.support_queue()
returns setof public.support_tickets language sql stable security definer set search_path=public as $$
  select t.* from support_tickets t
  where exists(select 1 from users u where u.id=auth.uid() and u.role in ('moderator','admin'))
  order by case t.priority when 'urgent' then 0 when 'high' then 1 else 2 end,t.created_at;
$$;

create or replace function public.update_support_ticket(
  ticket_id uuid, next_status text, resolution text default null, escalate boolean default false
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from users where id=auth.uid() and role in ('moderator','admin'))
     or next_status not in ('open','in_progress','waiting_on_user','resolved') then
    raise exception 'Not authorized';
  end if;
  update support_tickets set status=next_status,resolution_notes=coalesce(resolution,resolution_notes),
    escalated_to_development_at=case when escalate then coalesce(escalated_to_development_at,now()) else escalated_to_development_at end,
    assigned_to=coalesce(assigned_to,auth.uid()),updated_at=now() where id=ticket_id;
end; $$;

create or replace function public.moderate_member(
  target_user_id uuid, moderation_action text, action_notes text, related_report_id uuid default null
) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from users where id=auth.uid() and role in ('moderator','admin'))
     or moderation_action not in ('note','warning','suspend','ban','restore','dismiss')
     or char_length(btrim(coalesce(action_notes,''))) > 2000 then raise exception 'Not authorized'; end if;
  insert into moderation_actions(moderator_id,target_user_id,report_id,action,notes)
  values(auth.uid(),target_user_id,related_report_id,moderation_action,btrim(coalesce(action_notes,'')));
  if moderation_action='suspend' then
    update users set account_status='suspended',status_reason=action_notes,status_expires_at=now()+interval '7 days' where id=target_user_id;
    update musician_profiles set discovery_visible=false where user_id=target_user_id;
  elsif moderation_action='ban' then
    update users set account_status='banned',status_reason=action_notes,status_expires_at=null where id=target_user_id;
    update musician_profiles set discovery_visible=false where user_id=target_user_id;
  elsif moderation_action='restore' then
    update users set account_status='active',status_reason=null,status_expires_at=null where id=target_user_id;
  end if;
  if related_report_id is not null then
    update reports set status=case when moderation_action='dismiss' then 'dismissed' else 'actioned' end where id=related_report_id;
  end if;
end; $$;

revoke all on function public.create_support_ticket(text,text,text,jsonb) from public;
revoke all on function public.support_queue() from public;
revoke all on function public.update_support_ticket(uuid,text,text,boolean) from public;
revoke all on function public.moderate_member(uuid,text,text,uuid) from public;
grant execute on function public.create_support_ticket(text,text,text,jsonb) to authenticated;
grant execute on function public.support_queue() to authenticated;
grant execute on function public.update_support_ticket(uuid,text,text,boolean) to authenticated;
grant execute on function public.moderate_member(uuid,text,text,uuid) to authenticated;
