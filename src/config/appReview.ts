const APP_REVIEW_EMAIL = 'tester@gmail.com';

/**
 * Apple requires a stable account with populated content for App Review.
 * The account must authenticate against production first; only then is it
 * routed into the isolated fictional repository so no demo profiles enter the
 * real member network.
 */
export const isAppReviewAccount = (email?: string | null) =>
  email?.trim().toLowerCase() === APP_REVIEW_EMAIL;
