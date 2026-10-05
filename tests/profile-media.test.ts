import { describe, expect, it } from 'vitest';
import { profilePhotoUri } from '@/domain/profileMedia';

describe('profile photo selection', () => {
  it('prefers the designated profile photo over gallery images', () => {
    expect(
      profilePhotoUri({
        media: [
          { id: 'gallery', type: 'image', title: 'Live set', uri: 'gallery.jpg' },
          { id: 'profile', type: 'image', title: 'Profile photo', uri: 'profile.jpg' },
        ],
      }),
    ).toBe('profile.jpg');
  });

  it('falls back to another image and never selects audio', () => {
    expect(
      profilePhotoUri({
        media: [
          { id: 'audio', type: 'audio', title: 'Demo', uri: 'demo.mp3' },
          { id: 'gallery', type: 'image', title: 'Live set', uri: 'gallery.jpg' },
        ],
      }),
    ).toBe('gallery.jpg');
  });
});
