import { z } from 'zod';
const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email').max(254);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(128, 'Password is too long'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(12, 'Use at least 12 characters')
    .max(128, 'Password is too long')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
});
// Backward-compatible name for callers that validate new-account credentials.
export const authSchema = signUpSchema;
export const profileBasicsSchema = z.object({
  displayName: z.string().trim().min(2).max(50),
  age: z.number().int().min(18, 'Delos is for adults 18+').max(100),
  bio: z.string().trim().min(20).max(500),
  location: z.string().trim().min(2),
  travelRadiusKm: z.number().min(1).max(250),
});
export const profileSchema = profileBasicsSchema.extend({
  primaryInstrument: z.string().trim().min(1, 'Choose your primary instrument or role'),
  secondaryInstruments: z.array(z.string().trim().min(1)).max(12),
  desiredRoles: z
    .array(z.string().trim().min(1))
    .min(1, 'Choose at least one role you want to meet')
    .max(20),
  genres: z.array(z.string().trim().min(1)).min(1, 'Choose at least one genre').max(20),
  influences: z.array(z.string().trim().min(1)).max(20),
  yearsExperience: z.number().int().min(0).max(82),
  goals: z.array(z.string()).min(1, 'Choose at least one music goal'),
  availability: z
    .array(z.object({ day: z.string(), periods: z.array(z.string()).min(1) }))
    .min(1, 'Add at least one available time'),
  links: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url('Use a full public link beginning with https://'),
      }),
    )
    .max(8),
});
export const messageSchema = z.string().trim().min(1).max(2000);
export const reportSchema = z.object({ reason: z.string().min(1), details: z.string().max(1000) });
export const mediaRules = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 10_000_000 },
  audio: {
    types: [
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
    ],
    maxBytes: 25_000_000,
  },
  video: { types: ['video/mp4', 'video/quicktime'], maxBytes: 100_000_000 },
} as const;
