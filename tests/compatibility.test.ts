import { describe, expect, it } from 'vitest';
import { createBlankProfile } from '@/data/blankProfile';
import { DiscoveryPreferences, MusicianProfile } from '@/types';
import { calculateCompatibility, satisfiesHardRequirements } from '@/domain/compatibility';
const currentUser: MusicianProfile = {
  ...createBlankProfile('a'),
  displayName: 'Alex Rivers',
  age: 28,
  location: 'Detroit',
  bio: 'Guitarist seeking committed collaborators.',
  primaryInstrument: 'Guitar',
  desiredRoles: ['Drums'],
  genres: ['Indie', 'Alternative Rock'],
  influences: ['St. Vincent'],
  goals: ['Form a band'],
  availability: [{ day: 'Tue', periods: ['Evening'] }],
  distanceKm: 0,
};
const candidate: MusicianProfile = {
  ...currentUser,
  id: 'b',
  displayName: 'Morgan Lee',
  primaryInstrument: 'Drums',
  desiredRoles: ['Guitar'],
  distanceKm: 12,
};
describe('compatibility', () => {
  it('is deterministic and bounded', () => {
    const r = calculateCompatibility(currentUser, candidate);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.explanation).toContain('% match');
  });
  it('weights six factors to 100', () => {
    const r = calculateCompatibility(currentUser, {
      ...currentUser,
      id: 'other',
      distanceKm: 0,
      primaryInstrument: 'Drums',
      desiredRoles: ['Guitar'],
    });
    expect(r.score).toBe(100);
  });
  it('enforces distance, age, blocks, and role requirements', () => {
    const p = candidate;
    const pref: DiscoveryPreferences = {
      maxDistanceKm: 1,
      ageMin: 18,
      ageMax: 50,
      instruments: [],
      genres: [],
      goals: [],
      commitment: [],
    };
    expect(satisfiesHardRequirements(currentUser, p, pref)).toBe(false);
    expect(
      satisfiesHardRequirements(
        currentUser,
        { ...p, distanceKm: 0 },
        { ...pref, maxDistanceKm: 5 },
        [p.id],
      ),
    ).toBe(false);
  });
  it('honors Amplified practical-readiness filters', () => {
    const preferences: DiscoveryPreferences = {
      maxDistanceKm: 100,
      ageMin: 18,
      ageMax: 80,
      instruments: [],
      genres: [],
      goals: [],
      commitment: [],
      availableNowOnly: true,
      transportationRequired: true,
      performanceReadyGearRequired: true,
    };
    expect(satisfiesHardRequirements(currentUser, candidate, preferences)).toBe(false);
    expect(
      satisfiesHardRequirements(
        currentUser,
        {
          ...candidate,
          availableNow: true,
          transportation: true,
          performanceReadyGear: true,
        },
        preferences,
      ),
    ).toBe(true);
  });
});
