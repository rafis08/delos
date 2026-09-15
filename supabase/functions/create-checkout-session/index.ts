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

const safeReturnUrl = (value: unknown) => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'delos:') return url.toString();
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return url.toString();
    const configuredOrigin = Deno.env.get('DELOS_WEB_URL');
    return configuredOrigin && url.origin === new URL(configuredOrigin).origin
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Sign in required' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return json({ error: 'Invalid session' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const priceId = Deno.env.get('STRIPE_PRICE_AMPLIFIED_MONTHLY');
  if (!stripeKey || !priceId) return json({ error: 'Billing is not configured' }, 503);

  const payload = await request.json().catch(() => ({}));
  const returnUrl = safeReturnUrl(payload.returnUrl);
  if (!returnUrl) return json({ error: 'Invalid return URL' }, 400);

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-07-29.dahlia' });
  const { data: status } = await admin
    .from('subscription_status')
    .select('provider_customer_id,tier')
    .eq('user_id', data.user.id)
    .single();

  let customerId = status?.provider_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: data.user.email,
      metadata: { supabase_user_id: data.user.id },
    });
    customerId = customer.id;
    const { error } = await admin.from('subscription_status').upsert({
      user_id: data.user.id,
      provider: 'stripe',
      provider_customer_id: customerId,
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: 'Could not save billing customer' }, 500);
  }

  if (status?.tier === 'amplified') return json({ error: 'Subscription is already active' }, 409);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: data.user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}checkout=success`,
    cancel_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}checkout=cancelled`,
    allow_promotion_codes: true,
    integration_identifier: 'delos_web_qjrmvktp',
    metadata: { supabase_user_id: data.user.id },
    subscription_data: { metadata: { supabase_user_id: data.user.id } },
  } as Stripe.Checkout.SessionCreateParams);

  return json({ url: session.url });
});
