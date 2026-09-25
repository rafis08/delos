import type { ZodIssue } from 'zod';

export function friendlyProfileIssue(issue?: ZodIssue) {
  const field = String(issue?.path[0] || '');
  const messages: Record<string, string> = {
    displayName: 'Add the name you want other musicians to see.',
    age: 'Enter your age. Delos is for musicians 18 and older.',
    location: 'Add your city or general area so we can find nearby musicians.',
    bio: 'Write at least 20 characters about your sound, experience, and what you want to make.',
    primaryInstrument: 'Choose your primary instrument or role.',
    genres: 'Choose at least one genre that represents your sound.',
    influences: 'Add no more than 20 musical influences.',
    desiredRoles: 'Choose at least one role you want to meet.',
    goals: 'Choose at least one music goal.',
    availability: 'Choose at least one day you are usually available.',
    travelRadiusKm: 'Choose a travel radius between 1 and 250 km.',
    links: 'Check that every music link begins with https://.',
  };
  return messages[field] || issue?.message || 'Check this step and try again.';
}
