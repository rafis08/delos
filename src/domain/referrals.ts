export const REFERRALS_PER_REWARD = 5;

export function normalizeReferralCode(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9]{8,16}$/.test(normalized) ? normalized : null;
}

export function referralProgress(qualifiedCount: number) {
  const safeCount = Math.max(0, Math.floor(qualifiedCount));
  return {
    progress: safeCount % REFERRALS_PER_REWARD,
    rewardsEarned: Math.floor(safeCount / REFERRALS_PER_REWARD),
    remaining: REFERRALS_PER_REWARD - (safeCount % REFERRALS_PER_REWARD),
  };
}

export function canAttributeReferral(input: {
  referrerUserId: string;
  referredUserId: string;
  accountAlreadyAttributed: boolean;
  accountCreatedBeforeInvite: boolean;
}) {
  return Boolean(
    input.referrerUserId &&
    input.referredUserId &&
    input.referrerUserId !== input.referredUserId &&
    !input.accountAlreadyAttributed &&
    !input.accountCreatedBeforeInvite,
  );
}
