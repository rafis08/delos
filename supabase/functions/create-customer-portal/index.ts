// @ts-nocheck — runs in Supabase Edge Functions (Deno), not the Expo client runtime.
import Stripe from 'npm:stripe@22.4.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Sign in required' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return json({ error: 'Invalid session' }, 401);

  const payload = await request.json().catch(() => ({}));
  const returnUrl = typeof payload.returnUrl === 'string' ? payload.returnUrl : '';
  let parsed: URL;
  try {
    parsed = new URL(returnUrl);
  } catch {
    return json({ error: 'Invalid return URL' }, 400);
  }
  const configuredOrigin = Deno.env.get('DELOS_WEB_URL');
  const allowed =
    parsed.protocol === 'delos:' ||
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    (configuredOrigin && parsed.origin === new URL(configuredOrigin).origin);
  if (!allowed) return json({ error: 'Invalid return URL' }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: status } = await admin
    .from('subscription_status')
    .select('provider_customer_id')
    .eq('user_id', data.user.id)
    .single();
  if (!status?.provider_customer_id) return json({ error: 'No billing account found' }, 404);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) return json({ error: 'Billing is not configured' }, 503);
  const stripe = new Stripe(stripeKey, { apiVersion: '2026-07-29.dahlia' });
  const portal = await stripe.billingPortal.sessions.create({
    customer: status.provider_customer_id,
    return_url: parsed.toString(),
  });
  return json({ url: portal.url });
});
