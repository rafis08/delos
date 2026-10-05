import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback, useState } from 'react';
import { MainTabScreen } from '@/components/MainTabScreen';
import { Avatar, Button, Chip, Header, SettingRow, StateView } from '@/components/ui';
import { useApp } from '@/store/AppContext';
import { colors, radius, space, type } from '@/theme';
import { repository } from '@/data/repository';
import type { ReferralDashboard, SubscriptionTier } from '@/types';
import { profilePhotoUri } from '@/domain/profileMedia';
export default function Me() {
  const { profile, demoMode } = useApp();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [referrals, setReferrals] = useState<ReferralDashboard | null>(null);
  useFocusEffect(
    useCallback(() => {
      repository
        ?.getSubscriptionTier()
        .then(setTier)
        .catch(() => undefined);
      repository
        ?.getReferralDashboard()
        .then(setReferrals)
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
  const profilePhoto = profilePhotoUri(p);
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
        eyebrow={demoMode ? 'DEMO · FICTIONAL DATA' : 'YOUR MUSICIAN IDENTITY'}
        title="Profile"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        }
      />
      <View style={styles.identityCard}>
        <Avatar initials={p.initials} color={p.heroColor} size={104} uri={profilePhoto} />
        <View style={styles.identityCopy}>
          <View style={styles.nameLine}>
            <Text numberOfLines={1} style={styles.name}>
              {p.displayName}
            </Text>
            {p.verifiedEmail && (
              <Ionicons name="checkmark-circle" size={18} color={colors.orange} />
            )}
          </View>
          <Text style={styles.role}>
            {p.primaryInstrument} · {p.skill}
          </Text>
          <Text numberOfLines={1} style={styles.location}>
            <Ionicons name="location-outline" size={14} /> {p.location} · {p.yearsExperience} yrs
          </Text>
          {p.availableNow && (
            <View style={styles.availableBadge}>
              <View style={styles.availableDot} />
              <Text style={styles.availableText}>AVAILABLE NOW</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button label="Edit profile" onPress={() => router.push('/edit-profile')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Public preview"
            variant="secondary"
            onPress={() => router.push('/profile/me')}
          />
        </View>
      </View>
      <View style={styles.aboutCard}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>ABOUT MY SOUND</Text>
          <Text onPress={() => router.push('/edit-profile')} style={styles.inlineLink}>
            EDIT
          </Text>
        </View>
        <Text numberOfLines={4} style={styles.bio}>
          {p.bio}
        </Text>
        <View style={styles.chips}>
          {[...new Set(p.genres)].slice(0, 5).map((g) => (
            <Chip key={g} label={g} />
          ))}
        </View>
      </View>
      <Pressable onPress={() => router.push(next.route)} style={styles.completion}>
        <View style={styles.ring}>
          <Text style={styles.ringText}>{completion}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.compTitle}>Profile strength · {completion}%</Text>
          <Text numberOfLines={2} style={styles.compBody}>
            {next.text}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.orange} />
      </Pressable>
      <Pressable onPress={() => router.push('/invite')} style={styles.referralCard}>
        <View style={styles.referralIcon}>
          <Ionicons name="people" size={25} color={colors.accentInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.referralEyebrow}>BUILD THE SCENE</Text>
          <Text style={styles.referralTitle}>Invite musicians. Earn Premium.</Text>
          <View style={styles.referralTrack}>
            <View style={[styles.referralFill, { width: `${(referrals?.progress || 0) * 20}%` }]} />
          </View>
          <Text style={styles.referralBody}>{referrals?.progress || 0} of 5 friends joined</Text>
        </View>
        <Ionicons name="chevron-forward" size={21} color={colors.accentInk} />
      </Pressable>
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
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  identityCopy: { flex: 1, gap: 5 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, ...type.h2, flexShrink: 1 },
  availableBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  availableDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#39A96B' },
  availableText: { color: '#26784C', fontWeight: '900', fontSize: 10, letterSpacing: 0.7 },
  aboutCard: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    gap: space.sm,
  },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  inlineLink: { color: '#8A5000', fontSize: 11, fontWeight: '900' },
  completion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    backgroundColor: '#FFFBF2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  compTitle: { color: colors.text, fontWeight: '800' },
  compBody: { color: colors.muted, fontSize: 13, marginTop: 4 },
  ring: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 4,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: { color: colors.text, fontWeight: '900' },
  role: { color: colors.text, fontWeight: '700', fontSize: 14 },
  location: { color: colors.muted, fontSize: 13 },
  bio: { color: colors.text, fontSize: 15, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: '#E8A900',
  },
  referralIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  referralEyebrow: { color: '#704400', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  referralTitle: { color: colors.accentInk, fontWeight: '900', fontSize: 15, marginTop: 2 },
  referralBody: { color: '#704400', fontSize: 11, fontWeight: '700', marginTop: 4 },
  referralTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(112,68,0,0.18)',
    marginTop: 8,
    overflow: 'hidden',
  },
  referralFill: { height: '100%', borderRadius: 3, backgroundColor: colors.orange },
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
