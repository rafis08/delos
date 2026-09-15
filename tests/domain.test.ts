import { describe, expect, it } from 'vitest';
import { canMutateProfile, canReadConversation, canSendMessage } from '@/domain/authorization';
import { createMutualMatch } from '@/domain/matching';
import { authSchema, messageSchema, profileSchema } from '@/domain/validation';
import { createBlankProfile } from '@/data/blankProfile';
const validProfile = {
  ...createBlankProfile('a'),
  displayName: 'Alex Rivers',
  age: 28,
  location: 'Detroit',
  bio: 'Guitarist seeking committed collaborators.',
  primaryInstrument: 'Guitar',
  desiredRoles: ['Drums'],
  genres: ['Indie'],
  goals: ['Form a band'] as const,
};
describe('mutual matching', () => {
  it('creates a canonical match only on mutual interest', () => {
    expect(createMutualMatch([{ actorId: 'b', targetId: 'a' }], 'a', 'b')).toBe('a:b');
    expect(createMutualMatch([], 'a', 'b')).toBeNull();
  });
  it('rejects self likes', () => expect(() => createMutualMatch([], 'a', 'a')).toThrow());
});
describe('authorization', () => {
  it('allows only participants and owners', () => {
    expect(canReadConversation('a', ['a', 'b'])).toBe(true);
    expect(canReadConversation('x', ['a', 'b'])).toBe(false);
    expect(canMutateProfile('a', 'b')).toBe(false);
    expect(canSendMessage('a', ['a', 'b'], true)).toBe(false);
  });
});
describe('validation', () => {
  it('requires adults and safe inputs', () => {
    expect(profileSchema.safeParse({ ...validProfile, age: 17 }).success).toBe(false);
    expect(authSchema.safeParse({ email: 'bad', password: 'short' }).success).toBe(false);
    expect(messageSchema.safeParse(' '.repeat(3)).success).toBe(false);
  });
});
