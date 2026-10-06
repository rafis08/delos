import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const referralMigration = readFileSync(
  resolve('supabase/migrations/202610050001_referral_program.sql'),
  'utf8',
).toLowerCase();
const consistencyMigration = readFileSync(
  resolve('supabase/migrations/202610060003_premium_entitlement_consistency.sql'),
  'utf8',
).toLowerCase();
const securityMigration = readFileSync(
  resolve('supabase/migrations/202610060002_security_review_hardening.sql'),
  'utf8',
).toLowerCase();

describe('unified Premium authorization', () => {
  it('accepts paid subscriptions and active auditable grants', () => {
    expect(securityMigration).toContain("tier='amplified'");
    expect(securityMigration).toContain("status='active'");
    expect(securityMigration).toContain('starts_at<=now()');
    expect(securityMigration).toContain('ends_at>now()');
    expect(securityMigration).toContain('target_user_id is distinct from auth.uid()');
  });

  it('uses the same entitlement for every server-owned Premium feature', () => {
    for (const capability of [
      'my_like_allowance',
      'profiles_who_liked_me',
      'rewind_last_pass',
      'activate_profile_boost',
      'enforce_media_entitlement',
    ]) {
      const start = referralMigration.indexOf(`function public.${capability}`);
      expect(start).toBeGreaterThan(-1);
      expect(referralMigration.slice(start, start + 900)).toContain('has_delos_music_pro');
    }
    expect(consistencyMigration).toContain(
      'case when public.has_delos_music_pro(new.creator_id) then 3 else 1 end',
    );
  });

  it('enforces advanced discovery filters on the server', () => {
    expect(consistencyMigration).toContain('advanced_discovery_entitlement');
    expect(consistencyMigration).toContain('premium membership required for practical fit filters');
    expect(consistencyMigration).toContain('my_discovery_preferences');
  });
});
