import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [items, setItems] = useState(profile?.media.filter((item) => item.type !== 'image') || []);
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
      if (updated) setItems(updated.media.filter((item) => item.type !== 'image'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };
  const pickSample = async (kind: 'audio' | 'video') => {
    setError('');
    const result = await DocumentPicker.getDocumentAsync({
      type: kind === 'audio' ? ['audio/*'] : ['video/mp4', 'video/quicktime'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0]!;
    await upload(
      asset.uri,
      asset.mimeType || (kind === 'audio' ? 'audio/mpeg' : 'video/mp4'),
      asset.name,
      asset.size,
    );
  };
  return (
    <Screen>
      <Header eyebrow="YOUR SOUND" title="Performance samples" />
      <Text style={styles.note}>
        Let musicians hear or see you play before they connect. Add a strong audio take or a short
        performance video.
      </Text>
      <Text style={styles.usage}>
        {items.length} of {mediaLimit} media slots used
      </Text>
      <View style={styles.actions}>
        <AddSample
          icon="musical-notes"
          title="Add audio"
          subtitle="MP3, M4A, WAV · up to 25 MB"
          disabled={busy || items.length >= mediaLimit}
          onPress={() => pickSample('audio')}
        />
        <AddSample
          icon="videocam"
          title="Add video"
          subtitle="MP4 or MOV · up to 100 MB"
          disabled={busy || items.length >= mediaLimit}
          onPress={() => pickSample('video')}
        />
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
      {!items.length && !busy && (
        <View style={styles.empty}>
          <Ionicons name="play-circle-outline" size={34} color={colors.orange} />
          <Text style={styles.emptyTitle}>Your sound belongs here</Text>
          <Text style={styles.emptyBody}>Start with one memorable 30–60 second performance.</Text>
        </View>
      )}
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

function AddSample({
  icon,
  title,
  subtitle,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.addCard,
        disabled && styles.disabled,
        pressed && { opacity: 0.72 },
      ]}
    >
      <View style={styles.addIcon}>
        <Ionicons name={icon} size={24} color={colors.accentInk} />
      </View>
      <Text style={styles.addTitle}>{title}</Text>
      <Text style={styles.addSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  note: { color: colors.muted },
  error: { color: colors.danger },
  usage: { color: '#8B5000', fontWeight: '900', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  addCard: {
    flex: 1,
    minHeight: 144,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
  addIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  addSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  empty: {
    alignItems: 'center',
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: '#FFFBF2',
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 8 },
  emptyBody: { color: colors.muted, textAlign: 'center', marginTop: 5 },
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
