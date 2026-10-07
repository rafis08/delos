import { DiscoveryPreferences, MusicianProfile } from '@/types';

export const COMPATIBILITY_WEIGHTS = {
  genre: 25,
  role: 20,
  distance: 15,
  schedule: 15,
  commitment: 15,
  goal: 10,
} as const;

export type CompatibilityFactor = keyof typeof COMPATIBILITY_WEIGHTS;
export type CompatibilityResult = {
  score: number;
  label: 'Exceptional fit' | 'Strong fit' | 'Promising fit' | 'Possible fit';
  explanation: string;
  factors: Record<CompatibilityFactor, number>;
  factorDetails: Record<CompatibilityFactor, string>;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase();
const normalizedSet = (values: string[]) => new Set(values.filter(Boolean).map(normalize));
const overlap = (a: string[], b: string[]) => {
  const right = normalizedSet(b);
  return [
    ...new Map(
      a.filter((item) => right.has(normalize(item))).map((item) => [normalize(item), item]),
    ).values(),
  ];
};
const commitmentTiers = ['Casual', 'Consistent', 'Serious', 'Professional'];
const dayNames: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const instruments = (profile: MusicianProfile) => [
  profile.primaryInstrument,
  ...profile.secondaryInstruments,
];

function roleFit(me: MusicianProfile, them: MusicianProfile) {
  const iNeedThem = overlap(me.desiredRoles, instruments(them)).length > 0;
  const theyNeedMe = overlap(them.desiredRoles, instruments(me)).length > 0;
  if (iNeedThem && theyNeedMe)
    return { compatible: true, value: 1, detail: 'You fill roles each other needs' };
  if (iNeedThem)
    return {
      compatible: true,
      value: 0.75,
      detail: `${them.displayName} plays a role you need`,
    };
  if (theyNeedMe)
    return {
      compatible: true,
      value: 0.75,
      detail: `You play a role ${them.displayName} needs`,
    };
  if (!me.desiredRoles.length && !them.desiredRoles.length)
    return {
      compatible: true,
      value: 0.5,
      detail: 'Neither profile has specified needed roles yet',
    };
  return { compatible: false, value: 0, detail: 'Your current role needs do not line up' };
}

export function hasRoleCompatibility(me: MusicianProfile, candidate: MusicianProfile) {
  return roleFit(me, candidate).compatible;
}

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
    candidate.distanceKm !== null &&
    candidate.distanceKm <= preferences.maxDistanceKm &&
    (!preferences.availableNowOnly || candidate.availableNow) &&
    (!preferences.transportationRequired || candidate.transportation) &&
    (!preferences.performanceReadyGearRequired || candidate.performanceReadyGear) &&
    (preferences.instruments.length === 0 ||
      overlap(preferences.instruments, instruments(candidate)).length > 0) &&
    hasRoleCompatibility(me, candidate)
  );
}

export function calculateCompatibility(
  me: MusicianProfile,
  them: MusicianProfile,
  preferences?: DiscoveryPreferences,
): CompatibilityResult {
  const preferredGenres = preferences?.genres.length ? preferences.genres : me.genres;
  const sharedGenres = overlap(preferredGenres, them.genres);
  const genre = Math.min(1, sharedGenres.length / 2);

  const roleResult = roleFit(me, them);
  const distanceRadius = Math.max(preferences?.maxDistanceKm ?? me.travelRadiusKm, 1);
  const distance = them.distanceKm === null ? 0 : Math.max(0, 1 - them.distanceKm / distanceRadius);

  const mySlots = new Set(
    me.availability.flatMap((item) => item.periods.map((period) => `${item.day}-${period}`)),
  );
  const theirSlots = new Set(
    them.availability.flatMap((item) => item.periods.map((period) => `${item.day}-${period}`)),
  );
  const sharedSlots = [...mySlots].filter((slot) => theirSlots.has(slot));
  const availableComparison = Math.min(mySlots.size, theirSlots.size);
  const schedule = availableComparison ? Math.min(1, sharedSlots.length / availableComparison) : 0;

  const targetCommitments = preferences?.commitment.length
    ? preferences.commitment
    : [me.commitment];
  const theirTier = commitmentTiers.indexOf(them.commitment);
  const commitment = Math.max(
    0,
    ...targetCommitments.map((item) => {
      const targetTier = commitmentTiers.indexOf(item);
      return targetTier < 0 || theirTier < 0 ? 0 : 1 - Math.abs(targetTier - theirTier) / 3;
    }),
  );

  const targetGoals = preferences?.goals.length ? preferences.goals : me.goals;
  const sharedGoals = overlap(targetGoals, them.goals);
  const goal = Math.min(1, sharedGoals.length);
  const rawFactors: Record<CompatibilityFactor, number> = {
    genre,
    role: roleResult.value,
    distance,
    schedule,
    commitment,
    goal,
  };
  const factors = Object.fromEntries(
    (Object.keys(COMPATIBILITY_WEIGHTS) as CompatibilityFactor[]).map((factor) => [
      factor,
      Math.round(rawFactors[factor] * COMPATIBILITY_WEIGHTS[factor]),
    ]),
  ) as Record<CompatibilityFactor, number>;
  const score = Object.values(factors).reduce((total, value) => total + value, 0);
  const label =
    score >= 85
      ? 'Exceptional fit'
      : score >= 70
        ? 'Strong fit'
        : score >= 55
          ? 'Promising fit'
          : 'Possible fit';
  const readableSlots = sharedSlots.map((slot) => {
    const [day, period] = slot.split('-');
    return `${dayNames[day!] ?? day} ${period!.toLowerCase()}`;
  });
  const factorDetails: Record<CompatibilityFactor, string> = {
    genre: sharedGenres.length
      ? `Shared sound: ${sharedGenres.slice(0, 3).join(', ')}`
      : 'No shared selected genres yet',
    role: roleResult.detail,
    distance:
      them.distanceKm === null
        ? 'Distance is not available'
        : `${them.distanceKm} km away, within your ${distanceRadius} km search radius`,
    schedule: readableSlots.length
      ? `Both available ${readableSlots.slice(0, 2).join(' and ')}`
      : 'No overlapping availability selected',
    commitment:
      commitment === 1
        ? `Commitment aligns at ${them.commitment.toLowerCase()}`
        : `${them.commitment} commitment is close to what you want`,
    goal: sharedGoals.length ? `Shared goal: ${sharedGoals[0]}` : 'No shared selected goals yet',
  };
  const strongestReasons = (Object.keys(factors) as CompatibilityFactor[])
    .filter((factor) => factors[factor] > 0)
    .sort((a, b) => factors[b] / COMPATIBILITY_WEIGHTS[b] - factors[a] / COMPATIBILITY_WEIGHTS[a])
    .slice(0, 3)
    .map((factor) => factorDetails[factor]);
  return {
    score,
    label,
    explanation: `${score}% match · ${label}. ${strongestReasons.join('. ')}.`,
    factors,
    factorDetails,
  };
}
