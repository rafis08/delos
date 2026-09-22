import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('credential and deletion boundaries', () => {
  it('keeps privileged credentials out of the Expo repository client', () => {
    const repository = readFileSync('src/data/repository.ts', 'utf8');
    expect(repository).not.toMatch(/SERVICE_ROLE|STRIPE_SECRET|REVENUECAT_SECRET|WEBHOOK_SECRET/);
    expect(repository).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('uses secure native session storage and a server deletion function', () => {
    const repository = readFileSync('src/data/repository.ts', 'utf8');
    expect(repository).toContain('SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY');
    expect(repository).toContain("functions.invoke('delete-account')");
  });

  it('keeps service-role deletion code in the server function', () => {
    const deletion = readFileSync('supabase/functions/delete-account/index.ts', 'utf8');
    expect(deletion).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
    expect(deletion).toContain('admin.auth.admin.deleteUser');
    expect(deletion).not.toMatch(/console\.(log|error|warn)/);
  });

  it('prevents clients from bypassing processor-aware account deletion', () => {
    const migration = readFileSync(
      'supabase/migrations/202609220018_account_deletion_boundary.sql',
      'utf8',
    );
    expect(migration).toMatch(/revoke all on function public\.delete_own_account\(\) from authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.delete_own_account\(\) to service_role/i);
  });
});
