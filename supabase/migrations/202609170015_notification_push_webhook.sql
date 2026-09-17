-- Deliver newly created notifications to the secured push Edge Function.
-- The shared authorization value is stored in Vault and Edge Function Secrets,
-- never in this migration or the client bundle.
create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  webhook_secret text;
begin
  if coalesce((select notifications_muted from public.discovery_preferences where user_id = new.user_id), false) then
    return new;
  end if;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'push_notification_webhook_secret'
  limit 1;

  if webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://pfaotpeebrhmwmhadymw.supabase.co/functions/v1/push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end
$$;

revoke all on function public.dispatch_notification_push() from public;

drop trigger if exists notification_push_webhook on public.notifications;
create trigger notification_push_webhook
after insert on public.notifications
for each row execute function public.dispatch_notification_push();
