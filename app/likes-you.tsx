import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Header, Screen, StateView } from '@/components/ui';
import { PremiumPrompt } from '@/components/PremiumPrompt';
import { repository } from '@/data/repository';
import { colors, radius, space } from '@/theme';
import { MusicianProfile, SubscriptionTier } from '@/types';

export default function LikesYou() {
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [profiles, setProfiles] = useState<MusicianProfile[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    repository
      ?.getSubscriptionTier()
      .then(async (nextTier) => {
        setTier(nextTier);
        if (nextTier === 'amplified')
          setProfiles((await repository?.listProfilesWhoLikedMe()) || []);
      })
      .catch(() => setError('Likes could not load.'));
  }, []);
  return (
    <Screen>
      <Header eyebrow="YOUR SIGNAL" title="Liked you" />
      {tier === null ? (
        <StateView loading title="Checking your signal" body="Finding new interest…" />
      ) : tier === 'free' ? (
        <>
          <View style={styles.preview}>
            {['MC', 'JR', 'SK'].map((initials, index) => (
              <View key={initials} style={[styles.blurCard, { opacity: 0.78 - index * 0.14 }]}>
                <Avatar
                  initials={initials}
                  color={['#E96B16', '#F2B134', '#C98A12'][index]!}
                  size={58}
                />
                <View style={{ flex: 1, gap: 7 }}>
                  <View style={styles.hiddenWide} />
                  <View style={styles.hiddenShort} />
                </View>
              </View>
            ))}
          </View>
          <PremiumPrompt
            source="likes-you"
            title="Turn interest into matches faster"
            body="See everyone who already likes you and decide without waiting for them to appear in discovery."
          />
        </>
      ) : error ? (
        <StateView icon="warning-outline" title="Likes unavailable" body={error} />
      ) : profiles.length === 0 ? (
        <StateView
          icon="heart-outline"
          title="No new likes right now"
          body="Your newest interest will appear here. Strengthen your media or widen discovery to improve reach."
          action={<Button label="Improve profile" onPress={() => router.push('/edit-profile')} />}
        />
      ) : (
        profiles.map((profile) => (
          <Pressable
            key={profile.id}
            onPress={() => router.push(`/profile/${profile.id}`)}
            style={styles.person}
          >
            <Avatar
              initials={profile.initials}
              color={profile.heroColor}
              size={62}
              uri={profile.media.find((item) => item.type === 'image' && item.uri)?.uri}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {profile.displayName}, {profile.age}
              </Text>
              <Text style={styles.meta}>
                {profile.primaryInstrument} · {profile.location}
              </Text>
              <Text style={styles.signal}>LIKES YOUR PROFILE</Text>
            </View>
            <Text style={styles.open}>View →</Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { gap: 9 },
  blurCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  hiddenWide: { width: '65%', height: 14, borderRadius: 7, backgroundColor: colors.raised },
  hiddenShort: { width: '42%', height: 10, borderRadius: 5, backgroundColor: colors.raised },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 3 },
  signal: { color: '#9A5700', fontSize: 10, fontWeight: '900', letterSpacing: 0.6, marginTop: 7 },
  open: { color: colors.text, fontWeight: '800' },
});
