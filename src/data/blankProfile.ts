import { MusicianProfile } from '@/types';

export function createBlankProfile(userId = ''): MusicianProfile {
  return {
    id: userId,
    displayName: '',
    age: 18,
    location: '',
    distanceKm: 0,
    bio: '',
    primaryInstrument: 'Guitar',
    secondaryInstruments: [],
    desiredRoles: [],
    genres: [],
    influences: [],
    skill: 'Intermediate',
    yearsExperience: 0,
    commitment: 'Consistent',
    goals: [],
    material: 'Both',
    availability: [],
    rehearsalFrequency: 'Weekly',
    travelRadiusKm: 40,
    transportation: false,
    performanceReadyGear: false,
    links: [],
    verifiedEmail: false,
    lastActive: '',
    availableNow: false,
    heroColor: '#FFC53D',
    initials: '',
    media: [],
  };
}
