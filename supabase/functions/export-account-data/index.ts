// @ts-nocheck — runs in Supabase Edge Functions (Deno), not the Expo client runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const respond = (body: unknown, status = 200) => Response.json(body, { status, headers: {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="delos-data.json"',
} });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return respond({ ok: true });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization) return respond({ error: 'Sign in required' }, 401);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) return respond({ error: 'Invalid session' }, 401);
  const id = auth.user.id;
  const one = async (table: string, column = 'user_id') => (await client.from(table).select('*').eq(column,id)).data || [];
  const { data: matches } = await client.from('matches').select('*').or(`user_a.eq.${id},user_b.eq.${id}`);
  const matchIds = (matches || []).map((item) => item.id);
  const { data: conversations } = matchIds.length ? await client.from('conversations').select('*').in('match_id',matchIds) : { data: [] };
  const conversationIds = (conversations || []).map((item) => item.id);
  const messages = conversationIds.length ? (await client.from('messages').select('*').in('conversation_id',conversationIds)).data || [] : [];
  return respond({
    exportedAt: new Date().toISOString(),
    account: { id, email: auth.user.email, createdAt: auth.user.created_at },
    profile: await one('musician_profiles'), preferences: await one('discovery_preferences'),
    availability: await one('availability','profile_id'), influences: await one('influences','profile_id'),
    media: await one('media_samples','profile_id'), likesSent: await one('likes','actor_id'),
    passes: await one('passes','actor_id'), blocks: await one('blocks','blocker_id'),
    reportsSubmitted: await one('reports','reporter_id'), notifications: await one('notifications'),
    subscription: await one('subscription_status'), supportTickets: await one('support_tickets'),
    matches: matches || [], conversations: conversations || [], messages,
  });
});
