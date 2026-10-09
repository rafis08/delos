-- Preserve an immutable, server-side record of the legal terms accepted at signup.
alter table public.users add column if not exists terms_accepted_at timestamptz;
alter table public.users add column if not exists terms_version text;
alter table public.users add column if not exists privacy_accepted_at timestamptz;
alter table public.users add column if not exists privacy_version text;

create or replace function public.capture_signup_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare metadata jsonb;
begin
  select raw_user_meta_data into metadata from auth.users where id = new.id;
  if new.adult_attested_at is null
     or nullif(metadata->>'terms_accepted_at', '') is null
     or nullif(metadata->>'terms_version', '') is null
     or nullif(metadata->>'privacy_accepted_at', '') is null
     or nullif(metadata->>'privacy_version', '') is null then
    raise exception 'Age and legal acceptance are required';
  end if;
  new.terms_accepted_at := nullif(metadata->>'terms_accepted_at', '')::timestamptz;
  new.terms_version := nullif(metadata->>'terms_version', '');
  new.privacy_accepted_at := nullif(metadata->>'privacy_accepted_at', '')::timestamptz;
  new.privacy_version := nullif(metadata->>'privacy_version', '');
  return new;
end;
$$;

revoke all on function public.capture_signup_legal_acceptance() from public, anon, authenticated;
drop trigger if exists users_capture_signup_legal_acceptance on public.users;
create trigger users_capture_signup_legal_acceptance
before insert on public.users
for each row execute function public.capture_signup_legal_acceptance();

-- Clients can read their own acceptance record through the existing users policy, but cannot
-- rewrite it because users has no client update policy.
