// @ts-nocheck — runs in Supabase Edge Functions (Deno), not the Expo client runtime.
import Stripe from 'npm:stripe@22.4.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const response = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Cache-Control': 'no-store',
    },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return response({ ok: true });
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return response({ error: 'Sign in required' }, 401);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  );
  const { data, error: authError } = await userClient.auth.getUser();
  if (authError || !data.user) return response({ error: 'Invalid session' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: subscription, error: subscriptionError } = await admin
    .from('subscription_status')
    .select('provider,provider_customer_id')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (subscriptionError) return response({ error: 'Account deletion could not be completed' }, 500);

  // Remove processor-side customer data before deleting the local identifier.
  if (subscription?.provider === 'stripe' && subscription.provider_customer_id) {
    const key = Deno.env.get('STRIPE_SECRET_KEY');
    if (!key) return response({ error: 'Account deletion is temporarily unavailable' }, 503);
    const stripe = new Stripe(key, { apiVersion: '2026-07-29.dahlia' });
    try {
      await stripe.customers.del(subscription.provider_customer_id);
    } catch {
      return response({ error: 'Account deletion could not be completed' }, 502);
    }
  }

  const revenueCatKey = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (revenueCatKey) {
    const result = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(data.user.id)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${revenueCatKey}` } },
    );
    if (!result.ok && result.status !== 404) {
      return response({ error: 'Account deletion could not be completed' }, 502);
    }
  }

  const mediaBucket = admin.storage.from('profile-media');
  const { data: media, error: listError } = await mediaBucket.list(data.user.id, { limit: 1000 });
  if (listError) return response({ error: 'Account deletion could not be completed' }, 500);
  if (media?.length) {
    const { error: storageError } = await mediaBucket.remove(
      media.map((item) => `${data.user.id}/${item.name}`),
    );
    if (storageError) return response({ error: 'Account deletion could not be completed' }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return response({ error: 'Account deletion could not be completed' }, 500);
  return response({ deleted: true });
});
