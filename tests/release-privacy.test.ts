import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const legalMigration = readFileSync(
  'supabase/migrations/202610080001_legal_acceptance_audit.sql',
  'utf8',
).toLowerCase();
const privacyMigration = readFileSync(
  'supabase/migrations/202610080002_storage_reference_and_block_privacy.sql',
  'utf8',
).toLowerCase();
const privacyManifest = readFileSync('ios/Delos/PrivacyInfo.xcprivacy', 'utf8');

describe('release privacy and legal boundaries', () => {
  it('records versioned terms and privacy acceptance on the server', () => {
    expect(legalMigration).toContain('terms_accepted_at');
    expect(legalMigration).toContain('privacy_accepted_at');
    expect(legalMigration).toContain('raw_user_meta_data');
    expect(legalMigration).toContain('age and legal acceptance are required');
    expect(legalMigration).toContain(
      'revoke all on function public.capture_signup_legal_acceptance() from public, anon, authenticated',
    );
  });

  it('prevents cross-user storage references', () => {
    expect(privacyMigration).toContain("split_part(storage_path, '/', 1) = profile_id::text");
    expect(privacyMigration).toContain("split_part(profile_photo_path, '/', 1) = user_id::text");
    expect(privacyMigration).toContain("split_part(storage_path, '/', 1) = auth.uid()::text");
    expect(privacyMigration).toContain("split_part(ms.storage_path, '/', 1) = ms.profile_id::text");
  });

  it('applies blocks to nested profile and opportunity reads', () => {
    expect(privacyMigration).toContain('not public.is_blocked(p.user_id)');
    expect(privacyMigration).toContain('not public.is_blocked(creator_id)');
    expect(privacyMigration).toContain('not public.is_blocked(saved_user_id)');
  });

  it('bounds device tokens and support diagnostics', () => {
    expect(privacyMigration).toContain('char_length(expo_push_token) between 10 and 512');
    expect(privacyMigration).toContain('pg_column_size(diagnostics) <= 8192');
  });

  it('declares collected data without tracking in the iOS privacy manifest', () => {
    expect(privacyManifest).toContain('NSPrivacyCollectedDataTypeEmailAddress');
    expect(privacyManifest).toContain('NSPrivacyCollectedDataTypeCoarseLocation');
    expect(privacyManifest).toContain('NSPrivacyCollectedDataTypeOtherUserContent');
    expect(privacyManifest).toContain('<key>NSPrivacyTracking</key>');
    expect(privacyManifest).toContain('<false/>');
  });
});
