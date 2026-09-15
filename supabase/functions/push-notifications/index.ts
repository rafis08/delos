// @ts-nocheck — runs in Supabase Edge Functions (Deno), not the Expo client runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (request) => {
  const secret = request.headers.get('authorization');
  if (secret !== `Bearer ${Deno.env.get('WEBHOOK_SECRET')}`)
    return new Response('Unauthorized', { status: 401 });
  const { record } = await request.json();
  const admin = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  );
  const { data: devices } = await admin
    .from('push_devices')
    .select('expo_push_token')
    .eq('user_id', record.user_id)
    .eq('enabled', true);
  if (!devices?.length) return Response.json({ sent: 0 });
  const messages = devices.map(({ expo_push_token }) => ({
    to: expo_push_token,
    sound: 'default',
    title: record.title,
    body: record.body,
    data: { kind: record.kind },
  }));
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
});
