import type { MusicianProfile } from '@/types';

export function profilePhotoUri(profile: Pick<MusicianProfile, 'media' | 'profilePhotoUri'>) {
  if (profile.profilePhotoUri) return profile.profilePhotoUri;
  const images = profile.media.filter((item) => item.type === 'image' && item.uri);
  return images.find((item) => item.title === 'Profile photo')?.uri || images[0]?.uri;
}
