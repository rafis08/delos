import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MusicianProfile } from '@/types';
import { colors, radius, shadow } from '@/theme';
import { Chip } from './ui';
import { TrustSignals } from './TrustSignals';

export function ProfileCard({
  profile,
  score,
  explanation,
  compact = false,
}: {
  profile: MusicianProfile;
  score: number;
  explanation: string;
  compact?: boolean;
}) {
  const photo = profile.media.find((item) => item.type === 'image' && item.uri);
  return (
    <View style={[styles.card, shadow]}>
      <View style={[styles.art, { backgroundColor: profile.heroColor }]}>
        {photo?.uri && (
          <Image source={photo.uri} contentFit="cover" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.record} />
        <Text style={styles.initials}>{profile.initials}</Text>
        <LinearGradient
          colors={['transparent', 'rgba(9,9,11,.18)']}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.overlay}>
        <View style={styles.match}>
          <Ionicons name="pulse" size={15} color={colors.accentInk} />
          <Text style={styles.matchText}>{score}% MATCH</Text>
        </View>
        <Text style={styles.name}>
          {profile.displayName}, {profile.age}
        </Text>
        <Text style={styles.role}>
          {profile.primaryInstrument} · {profile.skill}
        </Text>
        <View style={styles.meta}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text style={styles.metaText}>{profile.distanceKm} km away</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>{profile.lastActive}</Text>
        </View>
        <View style={styles.chips}>
          {[...new Set(profile.genres)].slice(0, compact ? 1 : 2).map((g) => (
            <Chip key={g} label={g} />
          ))}
          {profile.availableNow && <Chip label="Available now" />}
        </View>
        <Text numberOfLines={compact ? 2 : 3} style={styles.explanation}>
          {explanation}
        </Text>
        {!compact && <TrustSignals profile={profile} compact />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${profile.displayName}'s full profile`}
          hitSlop={8}
          onPress={() => router.push(`/profile/${profile.id}`)}
          style={styles.moreButton}
        >
          <Text style={styles.more}>VIEW FULL PROFILE</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 0,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  art: {
    flexBasis: '42%',
    flexShrink: 1,
    minHeight: 142,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  record: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 48,
    borderColor: 'rgba(0,0,0,.16)',
  },
  initials: { color: colors.accentInk, fontSize: 92, fontWeight: '900', letterSpacing: -7 },
  overlay: { flexGrow: 1, padding: 13, gap: 4, backgroundColor: colors.panel },
  match: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    flexDirection: 'row',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  matchText: { color: colors.accentInk, fontSize: 12, fontWeight: '900' },
  name: { color: colors.text, fontSize: 24, lineHeight: 27, fontWeight: '800' },
  role: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: colors.muted, fontSize: 14 },
  dot: { color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 5 },
  explanation: { color: colors.text, fontSize: 12, lineHeight: 16, marginTop: 2 },
  moreButton: {
    alignSelf: 'stretch',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    marginTop: 'auto',
  },
  more: { color: colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
});
