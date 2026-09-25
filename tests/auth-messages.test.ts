import { describe, expect, it } from 'vitest';
import { friendlyAuthError } from '@/domain/authMessages';

describe('friendly authentication errors', () => {
  it('does not expose Supabase login wording', () => {
    expect(friendlyAuthError(new Error('Invalid login credentials'), 'Fallback')).toBe(
      'That email and password do not match.',
    );
  });

  it('gives an actionable response for an unconfirmed email', () => {
    expect(friendlyAuthError(new Error('Email not confirmed'), 'Fallback')).toBe(
      'Confirm your email before signing in.',
    );
  });

  it('uses a safe fallback when no error detail exists', () => {
    expect(friendlyAuthError(null, 'Try again.')).toBe('Try again.');
  });
});
