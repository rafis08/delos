import { describe, expect, it } from 'vitest';
import { profileSchema } from '@/domain/validation';
import { friendlyProfileIssue } from '@/domain/profileMessages';
import { createBlankProfile } from '@/data/blankProfile';

describe('profile validation messages', () => {
  it('explains an empty biography in plain language', () => {
    const result = profileSchema.safeParse(createBlankProfile('user'));
    if (result.success) throw new Error('Expected an invalid blank profile');
    const bioIssue = result.error.issues.find((issue) => issue.path[0] === 'bio');
    expect(friendlyProfileIssue(bioIssue)).toContain('at least 20 characters');
  });

  it('explains missing availability as an action', () => {
    expect(
      friendlyProfileIssue({
        code: 'custom',
        path: ['availability'],
        message: 'Invalid',
      }),
    ).toBe('Choose at least one day you are usually available.');
  });
});
