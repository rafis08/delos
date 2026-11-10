import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isAppReviewAccount } from '@/config/appReview';

describe('App Review access and safety', () => {
  it('routes only the authenticated reviewer identity to populated fictional data', () => {
    expect(isAppReviewAccount('tester@gmail.com')).toBe(true);
    expect(isAppReviewAccount(' TESTER@gmail.com ')).toBe(true);
    expect(isAppReviewAccount('member@example.com')).toBe(false);
  });

  it('makes every real block visible to the moderation queue', () => {
    const repository = readFileSync('src/data/repository.ts', 'utf8').toLowerCase();
    expect(repository).toContain("rpc('submit_report_rate_limited'");
    expect(repository).toContain("report_reason: 'member blocked'");
    expect(repository).toContain("from('blocks').insert");
  });

  it('does not claim unsupported background audio', () => {
    const plist = readFileSync('ios/Delos/Info.plist', 'utf8');
    const config = readFileSync('app.json', 'utf8');
    expect(plist).not.toContain('<string>audio</string>');
    expect(config).toContain('"enableBackgroundPlayback": false');
  });

  it('presents legal documents before acceptance during account creation only', () => {
    const signIn = readFileSync('app/auth/signin.tsx', 'utf8');
    const signUp = readFileSync('app/auth/signup.tsx', 'utf8');
    expect(signIn).not.toContain('legalAccepted');
    expect(signUp.indexOf('<View style={styles.legalLinks}>')).toBeLessThan(
      signUp.indexOf("onPress={() => setLegalAccepted"),
    );
  });
});
