export function friendlyAuthError(cause: unknown, fallback: string) {
  const raw = cause instanceof Error ? cause.message : '';
  const message = raw.toLowerCase();
  if (message.includes('invalid login credentials')) return 'That email and password do not match.';
  if (message.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (message.includes('user already registered'))
    return 'An account already exists for this email.';
  if (message.includes('password should be'))
    return 'Your password does not meet the requirements.';
  if (message.includes('rate limit') || message.includes('too many'))
    return 'Too many attempts. Wait a few minutes and try again.';
  if (message.includes('network') || message.includes('fetch'))
    return 'Delos could not connect. Check your connection and try again.';
  return raw || fallback;
}
