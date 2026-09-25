import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useCallback, useState } from 'react';
import { MainTabScreen } from '@/components/MainTabScreen';
import { Avatar, Button, Chip, Header, SettingRow, StateView } from '@/components/ui';
import { useApp } from '@/store/AppContext';
import { colors, radius, space, type } from '@/theme';
import { repository } from '@/data/repository';
import { SubscriptionTier } from '@/types';
export default function Me() {
  const { profile, demoMode } = useApp();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  useFocusEffect(
    useCallback(() => {
      repository
        ?.getSubscriptionTier()
        .then(setTier)
        .catch(() => undefined);
    }, []),
  );
  const p = profile;
  if (!p)
    return (
      <MainTabScreen tab="me" scroll={false}>
        <StateView
          icon="person-outline"
          title="Complete your profile"
          body="Add your musician details to appear in discovery."
          action={<Button label="Start profile" onPress={() => router.push('/onboarding')} />}
        />
      </MainTabScreen>
    );
  const signals = [
    Boolean(p.bio.trim()),
    p.genres.length >= 2,
    p.influences.length > 0,
    p.desiredRoles.length > 0,
    p.availability.length > 0,
    p.media.length > 0,
    p.goals.length > 0,
    Boolean(p.rehearsalFrequency),
  ];
  const completion = Math.round((signals.filter(Boolean).length / signals.length) * 100);
  const profilePhoto = p.media.find((item) => item.type === 'image' && item.uri)?.uri;
  const next = !p.media.length
    ? {
        text: 'Add a performance sample so musicians can hear your sound.',
        route: '/media' as const,
      }
    : !p.availability.length
      ? {
          text: 'Add your availability to improve real-world matches.',
          route: '/edit-profile' as const,
        }
      : !p.influences.length
        ? {
            text: 'Add influences to make your sound easier to understand.',
            route: '/edit-profile' as const,
          }
        : {
            text: 'Your profile is ready. Post a band call to create momentum.',
            route: '/opportunities' as const,
          };
  return (
    <MainTabScreen tab="me">
      <Header
        eyebrow={demoMode ? 'DEMO PROFILE · FICTIONAL DATA' : 'YOUR PROFILE'}
        title={p.displayName}
        right={<Avatar initials={p.initials} color={p.heroColor} size={68} uri={profilePhoto} />}
      />
      <View style={styles.completion}>
        <View style={{ flex: 1 }}>
          <Text style={styles.compTitle}>Profile strength · {completion}%</Text>
          <Text style={styles.compBody}>{next.text}</Text>
          <Text onPress={() => router.push(next.route)} style={styles.nextLink}>
            DO THIS NEXT →
          </Text>
        </View>
        <View style={styles.ring}>
          <Text style={styles.ringText}>{completion}</Text>
        </View>
      </View>
      <View>
        <Text style={styles.role}>
          {p.primaryInstrument} · {p.skill}
        </Text>
        <Text style={styles.location}>
          <Ionicons name="location-outline" /> {p.location} · {p.yearsExperience} years
        </Text>
      </View>
      <Text style={styles.bio}>{p.bio}</Text>
      <View style={styles.chips}>
        {[...new Set(p.genres)].map((g) => (
          <Chip key={g} label={g} />
        ))}
      </View>
      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button label="Edit profile" onPress={() => router.push('/edit-profile')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Preview" variant="secondary" onPress={() => router.push('/profile/me')} />
        </View>
      </View>
      <View style={[styles.membership, tier === 'amplified' && styles.membershipActive]}>
        <View style={styles.membershipMark}>
          <Ionicons name="sunny" size={21} color={colors.accentInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.membershipTitle}>
            {tier === 'amplified' ? 'Amplified is active' : 'Build your band faster'}
          </Text>
          <Text style={styles.membershipBody}>
            {tier === 'amplified'
              ? 'Unlimited discovery and premium controls are unlocked.'
              : 'See incoming likes, rewind passes, and search without limits.'}
          </Text>
        </View>
        <Text onPress={() => router.push('/premium')} style={styles.membershipLink}>
          {tier === 'amplified' ? 'MANAGE' : 'EXPLORE'}
        </Text>
      </View>
      <View style={styles.menu}>
        <SettingRow
          icon="bookmark"
          title="Musician shortlist"
          subtitle="Profiles saved for later"
          onPress={() => router.push('/saved')}
        />
        <SettingRow
          icon="megaphone"
          title="My band calls"
          subtitle="Post or browse active projects"
          onPress={() => router.push('/opportunities')}
        />
        <SettingRow
          icon="musical-notes"
          title="Profile media"
          subtitle="Photos, audio, and video"
          onPress={() => router.push('/media')}
        />
        <SettingRow
          icon="options"
          title="Discovery preferences"
          onPress={() => router.push('/filters')}
        />
        <SettingRow
          icon="settings"
          title="Settings & privacy"
          onPress={() => router.push('/settings')}
        />
        <SettingRow
          icon="sunny"
          title="Delos Amplified"
          subtitle="Explore premium"
          onPress={() => router.push('/premium')}
        />
      </View>
    </MainTabScreen>
  );
}
const styles = StyleSheet.create({
  completion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  compTitle: { color: colors.text, fontWeight: '800' },
  compBody: { color: colors.muted, fontSize: 13, marginTop: 4 },
  nextLink: { color: '#9A5700', fontSize: 11, fontWeight: '900', marginTop: 8, letterSpacing: 0.5 },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: { color: colors.text, fontWeight: '900' },
  role: { color: colors.text, ...type.h2 },
  location: { color: colors.muted, marginTop: 7 },
  bio: { color: colors.text, ...type.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  menu: { backgroundColor: colors.panel, paddingHorizontal: space.md, borderRadius: radius.lg },
  membership: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFF4CF',
    borderWidth: 1,
    borderColor: '#F2C35E',
  },
  membershipActive: { backgroundColor: '#FFF0C2', borderColor: colors.accent },
  membershipMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipTitle: { color: colors.text, fontWeight: '900' },
  membershipBody: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  membershipLink: { color: '#824A00', fontSize: 11, fontWeight: '900' },
});
