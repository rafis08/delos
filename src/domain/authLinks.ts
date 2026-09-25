import type { SupabaseClient } from '@supabase/supabase-js';

export type AuthLinkRoute = 'auth/confirm' | 'auth/update-password';

export function authLinkRoute(url: string): AuthLinkRoute | null {
  try {
    const parsed = new URL(url);
    const route = [parsed.protocol === 'delos:' ? parsed.hostname : '', parsed.pathname]
      .join('/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
    return route === 'auth/confirm' || route === 'auth/update-password' ? route : null;
  } catch {
    return null;
  }
}

function linkParameters(url: string) {
  const parsed = new URL(url);
  const query = parsed.searchParams;
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  return {
    code: query.get('code'),
    accessToken: query.get('access_token') || fragment.get('access_token'),
    refreshToken: query.get('refresh_token') || fragment.get('refresh_token'),
  };
}

const pending = new Map<string, Promise<void>>();

/** Establishes the Supabase session carried by an email confirmation or recovery link. */
export function establishSessionFromAuthLink(client: SupabaseClient, url: string) {
  const existing = pending.get(url);
  if (existing) return existing;

  const request = (async () => {
    const { code, accessToken, refreshToken } = linkParameters(url);
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return;
    }
    if (accessToken && refreshToken) {
      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      return;
    }
    const { data } = await client.auth.getSession();
    if (!data.session) throw new Error('This recovery link is invalid or has expired.');
  })().finally(() => pending.delete(url));

  pending.set(url, request);
  return request;
}
