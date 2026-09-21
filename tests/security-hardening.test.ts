import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve('supabase/migrations/202609200016_security_hardening.sql'),
  'utf8',
).toLowerCase();
const abuseMigration = readFileSync(
  resolve('supabase/migrations/202609210017_block_and_abuse_hardening.sql'),
  'utf8',
).toLowerCase();

describe('security hardening migration', () => {
  it('removes direct writes that bypass validated RPCs', () => {
    for (const table of ['likes', 'passes', 'messages', 'session_proposals', 'reports']) {
      expect(migration).toContain(`revoke insert, update, delete on public.${table}`);
    }
  });

  it('prevents members from changing their role', () => {
    expect(migration).toContain('revoke insert, update, delete on public.users from authenticated');
    expect(migration).not.toContain('for all to authenticated using (id = auth.uid())');
  });

  it('enforces blocks on messages, proposals, rooms, and storage', () => {
    expect(migration).toContain('public.can_access_conversation(conversation_id)');
    expect(migration).toContain('not public.can_access_conversation(target_conversation_id)');
    expect(migration).toContain('p.proposer_id <> auth.uid()');
    expect(migration).toContain('not public.is_blocked(p.user_id)');
  });

  it('requires storage objects to be registered and visible', () => {
    expect(migration).toContain('where ms.storage_path = name');
    expect(migration).toContain('and p.discovery_visible');
    expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text");
  });
});

describe('blocked-user and abuse hardening', () => {
  it('uses the shared conversation authorization guard for session operations', () => {
    expect(abuseMigration.match(/can_access_conversation/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('rate limits and validates band-call applications and reports', () => {
    expect(abuseMigration).toContain("created_at > now() - interval '1 hour'");
    expect(abuseMigration).toContain('not exists(select 1 from users where id = target_user_id)');
    expect(abuseMigration).toContain('public.is_blocked(owner_id)');
  });
});
