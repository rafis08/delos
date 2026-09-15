import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { MusicianProfile } from '@/types';
import { colors, radius } from '@/theme';

export function TrustSignals({
  profile,
  compact = false,
}: {
  profile: MusicianProfile;
  compact?: boolean;
}) {
  const signals = [
    profile.verifiedEmail && ['shield-checkmark', 'Verified email'],
    profile.media.some((item) => item.type !== 'image') && ['play-circle', 'Performance sample'],
    profile.performanceReadyGear && ['volume-high', 'Gig-ready gear'],
    profile.transportation && ['car', 'Has transportation'],
  ].filter(Boolean) as [keyof typeof Ionicons.glyphMap, string][];

  if (!signals.length) return null;
  return (
    <View
      accessibilityLabel={`Readiness signals: ${signals.map(([, label]) => label).join(', ')}`}
      style={styles.row}
    >
      {signals.slice(0, compact ? 2 : 4).map(([icon, label]) => (
        <View key={label} style={styles.signal}>
          <Ionicons name={icon} size={compact ? 12 : 15} color="#875000" />
          <Text style={[styles.label, compact && styles.compact]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  signal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FFF4CF',
    borderWidth: 1,
    borderColor: '#F2C35E',
  },
  label: { color: colors.text, fontSize: 11, fontWeight: '700' },
  compact: { fontSize: 10 },
});
