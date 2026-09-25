import { Commitment, Day, Goal, Skill } from '@/types';

export const instrumentOptions = [
  'Vocals',
  'Guitar',
  'Drums',
  'Bass',
  'Keys',
  'Saxophone',
  'Violin',
  'Producer',
];

export const genreOptions = [
  'Alternative Rock',
  'Rock',
  'Classic Rock',
  'Indie',
  'Indie Pop',
  'Shoegaze',
  'Emo',
  'Punk',
  'Hardcore',
  'R&B',
  'Neo-soul',
  'Soul',
  'Jazz',
  'Funk',
  'Blues',
  'Gospel',
  'Electronic',
  'House',
  'Techno',
  'Ambient',
  'Pop',
  'Metal',
  'Folk',
  'Americana',
  'Country',
  'Bluegrass',
  'Hip-hop',
  'Rap',
  'Reggae',
  'Latin',
  'Afrobeats',
  'Classical',
  'Experimental',
];

export const influenceSuggestions = [
  'Radiohead',
  'Beyoncé',
  'The Beatles',
  'Stevie Wonder',
  'Prince',
  'Nirvana',
  'Joni Mitchell',
  'Miles Davis',
  'Kendrick Lamar',
  'Paramore',
  'SZA',
  'Tame Impala',
];

export const goalOptions: Goal[] = [
  'Casual jams',
  'Form a band',
  'Join a band',
  'Session work',
  'Paid gigs',
];
export const commitmentOptions: Commitment[] = ['Casual', 'Consistent', 'Serious', 'Professional'];
export const skillOptions: Skill[] = ['Developing', 'Intermediate', 'Advanced', 'Professional'];
export const dayOptions: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const periodOptions = ['Morning', 'Afternoon', 'Evening'] as const;

export const toggleValue = <T extends string>(values: T[], value: T): T[] =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export const commaList = (value: string) => [
  ...new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];
