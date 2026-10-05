import { describe, expect, it } from 'vitest';
import { canAttributeReferral, normalizeReferralCode, referralProgress } from '@/domain/referrals';

describe('referral codes', () => {
  it('normalizes valid codes and rejects malformed input', () => {
    expect(normalizeReferralCode('  abcd1234 ')).toBe('ABCD1234');
    expect(normalizeReferralCode('short')).toBeNull();
    expect(normalizeReferralCode('invalid-link!')).toBeNull();
  });
});

describe('referral rewards', () => {
  it('awards one month for every five qualified referrals and resets progress', () => {
    expect(referralProgress(0)).toEqual({ progress: 0, rewardsEarned: 0, remaining: 5 });
    expect(referralProgress(4)).toEqual({ progress: 4, rewardsEarned: 0, remaining: 1 });
    expect(referralProgress(5)).toEqual({ progress: 0, rewardsEarned: 1, remaining: 5 });
    expect(referralProgress(12)).toEqual({ progress: 2, rewardsEarned: 2, remaining: 3 });
  });
});

describe('referral attribution', () => {
  const valid = {
    referrerUserId: 'one',
    referredUserId: 'two',
    accountAlreadyAttributed: false,
    accountCreatedBeforeInvite: false,
  };
  it('rejects self-referrals', () =>
    expect(canAttributeReferral({ ...valid, referredUserId: 'one' })).toBe(false));
  it('rejects existing or already-attributed accounts', () => {
    expect(canAttributeReferral({ ...valid, accountAlreadyAttributed: true })).toBe(false);
    expect(canAttributeReferral({ ...valid, accountCreatedBeforeInvite: true })).toBe(false);
  });
  it('accepts one legitimate new-account attribution', () =>
    expect(canAttributeReferral(valid)).toBe(true));
});
