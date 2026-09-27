/** Stable native callbacks that must also appear in Supabase's redirect URL allow list. */
export const authRedirects = {
  confirmEmail: 'delos://auth/confirm',
  updatePassword: 'delos://auth/update-password',
} as const;
