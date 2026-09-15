// @ts-nocheck — runs in Supabase Edge Functions (Deno), not the Expo client runtime.
import Stripe from 'npm:stripe@22.4.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const activeStatuses = new Set(['active', 'trialing']);

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret)
    return new Response('Billing is not configured', { status: 503 });

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  const stripe = new Stripe(stripeKey, { apiVersion: '2026-07-29.dahlia' });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: prior } = await admin
    .from('stripe_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle();
  if (prior) return Response.json({ received: true, duplicate: true });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id || session.metadata?.supabase_user_id;
    if (userId && session.customer && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
      const { error } = await admin.from('subscription_status').upsert({
        user_id: userId,
        tier: activeStatuses.has(subscription.status) ? 'amplified' : 'free',
        provider: 'stripe',
        provider_customer_id: String(session.customer),
        provider_subscription_id: subscription.id,
        provider_status: subscription.status,
        expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) return new Response('Could not update entitlement', { status: 500 });
    }
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const { error } = await admin
      .from('subscription_status')
      .update({
        tier: activeStatuses.has(subscription.status) ? 'amplified' : 'free',
        provider_subscription_id: subscription.id,
        provider_status: subscription.status,
        expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('provider_customer_id', String(subscription.customer));
    if (error) return new Response('Could not update entitlement', { status: 500 });
  }

  const { error: eventError } = await admin.from('stripe_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
  });
  if (eventError) return new Response('Could not record webhook', { status: 500 });
  return Response.json({ received: true });
});
