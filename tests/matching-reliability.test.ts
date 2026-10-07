import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve('supabase/migrations/202610070001_matching_reliability.sql'),
  'utf8',
).toLowerCase();

describe('server-side mutual matching reliability', () => {
  it('rejects self-likes, blocked users, and unavailable profiles', () => {
    expect(migration).toContain('actor = target_user_id');
    expect(migration).toContain('public.is_blocked(target_user_id)');
    expect(migration).toContain('and discovery_visible');
  });

  it('creates one canonical match and one conversation', () => {
    expect(migration).toContain('least(actor, target_user_id)');
    expect(migration).toContain('greatest(actor, target_user_id)');
    expect(migration).toContain('on conflict(user_a, user_b)');
    expect(migration).toContain('on conflict(match_id) do nothing');
  });

  it('only notifies when the action creates a new like', () => {
    expect(migration).toContain('returning true into created_like');
    expect(migration).toContain('if created_like then');
  });

  it('does not treat missing coordinates as zero distance', () => {
    expect(migration).toContain('then null');
    expect(migration).not.toContain('then 0 else 6371');
  });
});
