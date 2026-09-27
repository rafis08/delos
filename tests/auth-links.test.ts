import { describe, expect, it } from 'vitest';
import { authLinkRoute } from '../src/domain/authLinks';
import { authRedirects } from '../src/config/auth';

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

  it('uses stable native callback URLs', () => {
    expect(authRedirects.confirmEmail).toBe('delos://auth/confirm');
    expect(authRedirects.updatePassword).toBe('delos://auth/update-password');
  });
});
