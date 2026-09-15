// @ts-nocheck — runs in Supabase Edge Functions (Deno), not the Expo client runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!expected || request.headers.get('Authorization') !== `Bearer ${expected}`)
    return new Response('Unauthorized', { status: 401 });
  const body = await request.json().catch(() => null);
  const userId = body?.event?.app_user_id;
  if (!userId || String(userId).startsWith('$RCAnonymousID:'))
    return new Response('Ignored', { status: 202 });
  const secret = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!secret) return new Response('Billing is not configured', { status: 503 });
  const verified = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' } },
  );
  if (!verified.ok) return new Response('Verification failed', { status: 502 });
  const subscriber = (await verified.json()).subscriber;
  const entitlement = subscriber?.entitlements?.amplified;
  const expiresAt = entitlement?.expires_date || null;
  const active = Boolean(entitlement && (!expiresAt || new Date(expiresAt) > new Date()));
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error } = await admin.from('subscription_status').upsert({
    user_id: userId,
    tier: active ? 'amplified' : 'free',
    provider: 'revenuecat',
    provider_status: active ? 'active' : 'inactive',
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) return new Response('Update failed', { status: 500 });
  return Response.json({ received: true });
});
