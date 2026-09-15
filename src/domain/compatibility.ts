import { DiscoveryPreferences, MusicianProfile } from '@/types';

export type CompatibilityResult = {
  score: number;
  explanation: string;
  factors: Record<string, number>;
};
const overlap = <T>(a: T[], b: T[]) => a.filter((item) => b.includes(item));
const tier = ['Casual', 'Consistent', 'Serious', 'Professional'];
export function satisfiesHardRequirements(
  me: MusicianProfile,
  candidate: MusicianProfile,
  preferences: DiscoveryPreferences,
  blockedIds: string[] = [],
) {
  return (
    !blockedIds.includes(candidate.id) &&
    candidate.age >= preferences.ageMin &&
    candidate.age <= preferences.ageMax &&
    candidate.distanceKm <= preferences.maxDistanceKm &&
    (!preferences.availableNowOnly || candidate.availableNow) &&
    (!preferences.transportationRequired || candidate.transportation) &&
    (!preferences.performanceReadyGearRequired || candidate.performanceReadyGear) &&
    (preferences.instruments.length === 0 ||
      preferences.instruments.includes(candidate.primaryInstrument) ||
      candidate.secondaryInstruments.some((x) => preferences.instruments.includes(x))) &&
    (candidate.desiredRoles.includes(me.primaryInstrument) ||
      me.desiredRoles.includes(candidate.primaryInstrument))
  );
}
export function calculateCompatibility(
  me: MusicianProfile,
  them: MusicianProfile,
): CompatibilityResult {
  const sharedGenres = overlap(me.genres, them.genres);
  const genre = Math.min(1, sharedGenres.length / 2);
  const role =
    them.desiredRoles.includes(me.primaryInstrument) ||
    me.desiredRoles.includes(them.primaryInstrument)
      ? 1
      : 0;
  const distance = Math.max(0, 1 - them.distanceKm / Math.max(me.travelRadiusKm, 1));
  const sharedSlots = me.availability
    .flatMap((a) => a.periods.map((p) => `${a.day}-${p}`))
    .filter((x) =>
      them.availability.flatMap((a) => a.periods.map((p) => `${a.day}-${p}`)).includes(x),
    );
  const schedule = Math.min(1, sharedSlots.length);
  const commitment = Math.max(
    0,
    1 - Math.abs(tier.indexOf(me.commitment) - tier.indexOf(them.commitment)) / 3,
  );
  const sharedGoals = overlap(me.goals, them.goals);
  const goal = Math.min(1, sharedGoals.length);
  const score = Math.round(
    genre * 25 + role * 20 + distance * 15 + schedule * 15 + commitment * 15 + goal * 10,
  );
  const reasons = [
    sharedGenres[0] && `play ${sharedGenres[0].toLowerCase()}`,
    sharedSlots[0] && `are free ${sharedSlots[0].replace('-', ' ').toLowerCase()}`,
    sharedGoals[0] && `want to ${sharedGoals[0].toLowerCase()}`,
  ].filter(Boolean);
  return {
    score,
    explanation: `${score}% match: You both ${reasons.slice(0, 3).join(', and ')}.`,
    factors: {
      genre: Math.round(genre * 25),
      role: Math.round(role * 20),
      distance: Math.round(distance * 15),
      schedule: Math.round(schedule * 15),
      commitment: Math.round(commitment * 15),
      goal: Math.round(goal * 10),
    },
  };
}
