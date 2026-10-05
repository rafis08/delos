import * as ImagePicker from 'expo-image-picker';
import { mediaRules } from '@/domain/validation';

export type PickedProfilePhoto = { uri: string; mimeType: string };

export async function pickProfilePhoto(): Promise<PickedProfilePhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.82,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  const mimeType = asset.mimeType || 'image/jpeg';
  if (
    !mediaRules.image.types.includes(mimeType as never) ||
    (asset.fileSize && asset.fileSize > mediaRules.image.maxBytes)
  ) {
    throw new Error('Choose a JPEG, PNG, or WebP image smaller than 10 MB.');
  }
  return { uri: asset.uri, mimeType };
}
