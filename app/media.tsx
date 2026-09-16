import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Header, Screen } from '@/components/ui';
import { AudioSamplePlayer } from '@/components/AudioSamplePlayer';
import { PremiumPrompt } from '@/components/PremiumPrompt';
import { repository } from '@/data/repository';
import { mediaRules } from '@/domain/validation';
import { useApp } from '@/store/AppContext';
import { colors, radius, space } from '@/theme';
import { SubscriptionTier } from '@/types';
export default function MediaManager() {
  const { profile, uploadMedia } = useApp();
  const [items, setItems] = useState(profile?.media || []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>('free');
  useEffect(() => {
    repository
      ?.getSubscriptionTier()
      .then(setTier)
      .catch(() => undefined);
  }, []);
  const mediaLimit = tier === 'amplified' ? 10 : 3;
  const upload = async (uri: string, mimeType: string, title: string, size?: number) => {
    const kind = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('audio/')
        ? 'audio'
        : 'video';
    const rule = mediaRules[kind];
    if (!rule.types.includes(mimeType as never) || (size && size > rule.maxBytes)) {
      setError('That file type or size is not supported.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await uploadMedia(uri, mimeType, title);
      const updated = await repository?.getProfile(profile!.id);
      if (updated) setItems(updated.media);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header eyebrow="YOUR SOUND" title="Profile media" />
      <Text style={styles.note}>
        Add a profile image, audio clip, or short performance video. Media stays private to
        signed-in members.
      </Text>
      <Text style={styles.usage}>
        {items.length} of {mediaLimit} media slots used
      </Text>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button
            label="Add photo"
            variant="secondary"
            disabled={busy || items.length >= mediaLimit}
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
              });
              if (!result.canceled) {
                const asset = result.assets[0]!;
                await upload(
                  asset.uri,
                  asset.mimeType || 'image/jpeg',
                  'Profile photo',
                  asset.fileSize,
                );
              }
            }}
          />
        </View>
        <View style={styles.flex}>
          <Button
            label="Add sample"
            variant="secondary"
            disabled={busy || items.length >= mediaLimit}
            onPress={async () => {
              const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*', 'video/mp4', 'video/quicktime'],
              });
              if (!result.canceled) {
                const asset = result.assets[0]!;
                await upload(asset.uri, asset.mimeType || 'audio/mpeg', asset.name, asset.size);
              }
            }}
          />
        </View>
      </View>
      {busy && <Text style={styles.note}>Uploading securely…</Text>}
      {tier === 'free' && items.length >= mediaLimit && (
        <PremiumPrompt
          source="media-limit"
          title="Your strongest takes deserve room"
          body="Amplified expands your profile from 3 to 10 photos and performance samples."
        />
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <View style={styles.itemBody}>
            <Text style={styles.type}>{item.type.toUpperCase()}</Text>
            {item.type === 'audio' ? (
              <AudioSamplePlayer uri={item.uri} title={item.title} />
            ) : (
              <Text style={styles.title}>{item.title}</Text>
            )}
          </View>
          <Button
            label="Remove"
            variant="ghost"
            onPress={async () => {
              await repository?.deleteMedia(item.id, item.storagePath);
              setItems((current) => current.filter((value) => value.id !== item.id));
            }}
          />
        </View>
      ))}
    </Screen>
  );
}
const styles = StyleSheet.create({
  note: { color: colors.muted },
  error: { color: colors.danger },
  usage: { color: '#8B5000', fontWeight: '900', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  item: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  itemBody: { gap: 8 },
  type: { color: colors.accent, fontWeight: '900', fontSize: 11 },
  title: { flex: 1, color: colors.text, fontWeight: '700' },
});
