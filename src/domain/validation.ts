import { z } from 'zod';
export const authSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(50),
  age: z.number().int().min(18, 'Delos is for adults 18+').max(100),
  bio: z.string().trim().min(20).max(500),
  location: z.string().trim().min(2),
  travelRadiusKm: z.number().min(1).max(250),
});
export const messageSchema = z.string().trim().min(1).max(2000);
export const reportSchema = z.object({ reason: z.string().min(1), details: z.string().max(1000) });
export const mediaRules = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 10_000_000 },
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/wav'], maxBytes: 25_000_000 },
  video: { types: ['video/mp4', 'video/quicktime'], maxBytes: 100_000_000 },
} as const;
