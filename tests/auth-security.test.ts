import { describe, expect, it } from 'vitest';
import { signInSchema, signUpSchema } from '@/domain/validation';

describe('authentication validation', () => {
  it('requires stronger passwords for new accounts', () => {
    expect(signUpSchema.safeParse({ email: 'a@example.com', password: 'short123A' }).success).toBe(
      false,
    );
    expect(
      signUpSchema.safeParse({ email: 'a@example.com', password: 'LongerPassword123' }).success,
    ).toBe(true);
  });

  it('does not lock existing users out based on a newer signup policy', () => {
    expect(signInSchema.safeParse({ email: 'a@example.com', password: 'legacy-pass' }).success).toBe(
      true,
    );
  });
});
