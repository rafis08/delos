// @ts-nocheck — runs in Supabase Edge Functions (Deno), not the Expo client runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return response({ ok: true });
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization) return response({ error: 'Sign in required' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data } = await client.auth.getUser();
  if (!data.user) return response({ error: 'Invalid session' }, 401);
  const secret = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!secret) return response({ error: 'Native billing is not configured' }, 503);
  const revenueCat = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(data.user.id)}`,
    { headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' } },
  );
  if (!revenueCat.ok) return response({ error: 'Could not verify App Store purchase' }, 502);
  const subscriber = (await revenueCat.json()).subscriber;
  const entitlement = subscriber?.entitlements?.amplified;
  const expiresAt = entitlement?.expires_date || null;
  const active = Boolean(entitlement && (!expiresAt || new Date(expiresAt) > new Date()));
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error } = await admin.from('subscription_status').upsert({
    user_id: data.user.id,
    tier: active ? 'amplified' : 'free',
    provider: 'revenuecat',
    provider_status: active ? 'active' : 'inactive',
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) return response({ error: 'Could not update entitlement' }, 500);
  return response({ tier: active ? 'amplified' : 'free', expiresAt });
});
