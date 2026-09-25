import { describe, expect, it } from 'vitest';
import { authLinkRoute } from '../src/domain/authLinks';

describe('authentication email links', () => {
  it('recognizes native recovery links split into host and path', () => {
    expect(authLinkRoute('delos://auth/update-password?code=abc')).toBe('auth/update-password');
  });

  it('recognizes web recovery links', () => {
    expect(authLinkRoute('https://delosmusic.app/auth/update-password?code=abc')).toBe(
      'auth/update-password',
    );
  });

  it('rejects unrelated routes', () => {
    expect(authLinkRoute('delos://profile/someone')).toBeNull();
  });
});
