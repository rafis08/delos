alter table public.subscription_status
  add column if not exists provider_subscription_id text,
  add column if not exists provider_status text;

create unique index if not exists subscription_provider_customer_idx
  on public.subscription_status(provider_customer_id)
  where provider_customer_id is not null;

create unique index if not exists subscription_provider_subscription_idx
  on public.subscription_status(provider_subscription_id)
  where provider_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
-- No client policy: only the service-role webhook function may access this table.
