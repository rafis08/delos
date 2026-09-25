import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SwipeableProfileCard } from '@/components/SwipeableProfileCard';
import { MainTabScreen } from '@/components/MainTabScreen';
import { BrandLockup } from '@/components/BrandMark';
import { IconButton, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { calculateCompatibility, satisfiesHardRequirements } from '@/domain/compatibility';
import { useApp } from '@/store/AppContext';
import { DiscoveryPreferences, LikeAllowance, MusicianProfile } from '@/types';
const defaultPrefs: DiscoveryPreferences = {
  maxDistanceKm: 80,
  ageMin: 18,
  ageMax: 50,
  instruments: [],
  genres: [],
  goals: [],
  commitment: [],
};
export default function Discover() {
  const { like, pass, offline, profile, userId, demoMode } = useApp();
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadedProfiles, setLoadedProfiles] = useState<MusicianProfile[]>([]);
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [allowance, setAllowance] = useState<LikeAllowance | null>(null);
  const [lastDecision, setLastDecision] = useState<'like' | 'pass' | null>(null);
  const { width, height } = useWindowDimensions();
  const profiles = useMemo(
    () =>
      profile
        ? loadedProfiles.filter((candidate) => satisfiesHardRequirements(profile, candidate, prefs))
        : [],
    [loadedProfiles, profile, prefs],
  );
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!repository || !userId) {
        setLoading(false);
        return () => {
          active = false;
        };
      }
      setLoading(true);
      void repository.trackEvent('discovery_viewed').catch(() => undefined);
      Promise.all([
        repository.listProfiles(userId),
        repository.getDiscoveryPreferences(),
        repository.getLikeAllowance().catch(() => null),
      ])
        .then(([nextProfiles, nextPrefs, nextAllowance]) => {
          if (active) {
            setLoadedProfiles(nextProfiles);
            setPrefs(nextPrefs);
            setIndex(0);
            setAllowance(nextAllowance);
          }
        })
        .catch((cause) =>
          setError(cause instanceof Error ? cause.message : 'Could not load discovery'),
        )
        .finally(() => setLoading(false));
      return () => {
        active = false;
      };
    }, [userId]),
  );
  const p = profiles[index];
  const decide = async (kind: 'like' | 'pass') => {
    if (!p) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (kind === 'like') {
        const matched = await like(p.id);
        void repository?.trackEvent('connection_sent', { profileId: p.id }).catch(() => undefined);
        if (matched)
          void repository?.trackEvent('match_created', { profileId: p.id }).catch(() => undefined);
        setAllowance((current) =>
          current?.remaining == null
            ? current
            : {
                ...current,
                used: current.used + 1,
                remaining: Math.max(0, current.remaining - 1),
              },
        );
        if (matched)
          Alert.alert("It's a match!", `You and ${p.displayName} can message now.`, [
            { text: 'Keep browsing' },
            { text: 'View matches', onPress: () => router.push('/(tabs)/matches') },
          ]);
      } else await pass(p.id);
      setLastDecision(kind);
      setIndex((i) => i + 1);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'That action could not be saved.';
      if (message.toLowerCase().includes('like limit')) {
        Alert.alert(
          'You used today’s free likes',
          'Keep discovering without limits with Delos Amplified.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'See Amplified',
              onPress: () =>
                router.push({ pathname: '/premium', params: { source: 'like-limit' } }),
            },
          ],
        );
      } else Alert.alert('Try again', message);
    }
  };
  if (loading)
    return (
      <MainTabScreen tab="discover" scroll={false}>
        <StateView
          loading
          title="Tuning recommendations"
          body="Comparing your sound, schedule, and goals…"
        />
      </MainTabScreen>
    );
  if (offline)
    return (
      <MainTabScreen tab="discover" scroll={false}>
        <StateView
          icon="cloud-offline-outline"
          title="You’re offline"
          body="Your saved matches and messages are still available. Discovery will resume when you reconnect."
        />
      </MainTabScreen>
    );
  if (error)
    return (
      <MainTabScreen tab="discover" scroll={false}>
        <StateView icon="warning-outline" title="Discovery unavailable" body={error} />
      </MainTabScreen>
    );
  if (!p)
    return (
      <MainTabScreen tab="discover" scroll={false}>
        <StateView
          icon="checkmark-done"
          title="You’re all caught up"
          body="You’ve heard everyone in your current radius. Adjust filters or check back soon."
          action={
            <IconButton
              icon="options"
              label="Adjust filters"
              onPress={() => router.push('/filters')}
            />
          }
        />
      </MainTabScreen>
    );
  const c = calculateCompatibility(profile!, p);
  return (
    <MainTabScreen
      tab="discover"
      scroll={false}
      style={[styles.screen, width > 900 && { maxWidth: 620 }]}
    >
      <View style={styles.top}>
        <BrandLockup compact slogan />
        {demoMode && <Text style={styles.demoBadge}>DEMO</Text>}
        <View style={styles.topActions}>
          <IconButton
            icon="megaphone-outline"
            label="Band calls"
            onPress={() => router.push('/opportunities')}
          />
          <IconButton
            icon="options-outline"
            label="Discovery filters"
            onPress={() => router.push('/filters')}
          />
        </View>
      </View>
      <View style={styles.signalBar}>
        <Pressable onPress={() => router.push('/likes-you')} style={styles.signalAction}>
          <Text style={styles.signalStrong}>♥ LIKED YOU</Text>
          <Text style={styles.signalMuted}>See your incoming signal</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/premium', params: { source: 'discovery-meter' } })
          }
          style={styles.signalAction}
        >
          <Text style={styles.signalStrong}>
            ⚡{' '}
            {allowance?.tier === 'amplified'
              ? 'AMPLIFIED'
              : `${allowance?.remaining ?? '—'} LIKES LEFT`}
          </Text>
          <Text style={styles.signalMuted}>
            {allowance?.tier === 'amplified'
              ? 'Unlimited discovery'
              : 'Resets daily · Go unlimited'}
          </Text>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        <SwipeableProfileCard
          key={p.id}
          profile={p}
          score={c.score}
          explanation={c.explanation}
          compact={height < 780}
          onDecision={decide}
        />
      </View>
      <View style={styles.actions}>
        <IconButton
          icon="play-back"
          label="Rewind previous pass"
          onPress={async () => {
            if (allowance?.tier !== 'amplified') {
              router.push({ pathname: '/premium', params: { source: 'rewind' } });
              return;
            }
            if (lastDecision !== 'pass' || index === 0) {
              Alert.alert('Nothing to rewind', 'Pass on someone first, then use rewind.');
              return;
            }
            try {
              await repository?.rewindLastPass();
              setIndex((current) => Math.max(0, current - 1));
              setLastDecision(null);
            } catch {
              Alert.alert('Could not rewind', 'Please try again.');
            }
          }}
        />
        <IconButton
          icon="close"
          label={`Pass on ${p.displayName}`}
          danger
          onPress={() => decide('pass')}
        />
        <IconButton
          icon="bookmark-outline"
          label="Save for later"
          onPress={async () => {
            await repository?.saveProfileForLater(p.id);
            Alert.alert(
              'Added to your shortlist',
              `You can revisit ${p.displayName} from your profile.`,
            );
          }}
        />
        <IconButton
          icon="heart"
          label={`Invite ${p.displayName} to connect`}
          accent
          onPress={() => decide('like')}
        />
      </View>
    </MainTabScreen>
  );
}
const styles = StyleSheet.create({
  screen: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { transform: [{ scale: 0.78 }], flexDirection: 'row' },
  signalBar: { flexDirection: 'row', gap: 8 },
  signalAction: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFF4CF',
    borderWidth: 1,
    borderColor: '#F2C35E',
  },
  signalStrong: { color: '#754300', fontSize: 10, fontWeight: '900', letterSpacing: 0.35 },
  signalMuted: { color: '#746856', fontSize: 9, marginTop: 2 },
  demoBadge: {
    color: '#7A4100',
    backgroundColor: '#FFF0C2',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    minHeight: 58,
  },
});
