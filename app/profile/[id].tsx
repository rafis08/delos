import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { AudioSamplePlayer } from '@/components/AudioSamplePlayer';
import { Button, Chip, Header, IconButton, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import {
  calculateCompatibility,
  COMPATIBILITY_WEIGHTS,
  CompatibilityFactor,
} from '@/domain/compatibility';
import { useApp } from '@/store/AppContext';
import { colors, radius, space, type } from '@/theme';
import { DiscoveryPreferences, MusicianProfile } from '@/types';
import { TrustSignals } from '@/components/TrustSignals';
import { profilePhotoUri } from '@/domain/profileMedia';
export default function FullProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { like, pass, block, profile } = useApp();
  const [remote, setRemote] = useState<MusicianProfile | null>(id === 'me' ? profile : null);
  const [preferences, setPreferences] = useState<DiscoveryPreferences | null>(null);
  const [loading, setLoading] = useState(id !== 'me');
  useEffect(() => {
    if (id === 'me') {
      setRemote(profile);
      setLoading(false);
      return;
    }
    if (!repository) {
      setLoading(false);
      return;
    }
    Promise.all([repository.getProfile(id), repository.getDiscoveryPreferences()])
      .then(([musician, discoveryPreferences]) => {
        setRemote(musician);
        setPreferences(discoveryPreferences);
      })
      .finally(() => setLoading(false));
  }, [id, profile]);
  if (loading)
    return (
      <Screen scroll={false}>
        <StateView loading title="Loading profile" body="Getting the latest musician details…" />
      </Screen>
    );
  if (!remote || !profile)
    return (
      <Screen scroll={false}>
        <StateView
          icon="person-outline"
          title="Profile unavailable"
          body="This musician may no longer be visible."
        />
      </Screen>
    );
  const p = remote;
  const photo = profilePhotoUri(p);
  const performances = p.media.filter((item) => item.type !== 'image');
  const isOwner = id === 'me';
  const c = isOwner ? null : calculateCompatibility(profile, p, preferences ?? undefined);
  return (
    <Screen>
      <Header
        eyebrow={c ? `${c.score}% MATCH · ${c.label.toUpperCase()}` : 'YOUR MUSICIAN PROFILE'}
        title={`${p.displayName}, ${p.age}`}
        right={
          <View style={styles.headerActions}>
            <IconButton
              icon="share-outline"
              label="Share profile"
              onPress={() =>
                Share.share({
                  message: `Check out ${p.displayName}, a ${p.primaryInstrument} player on Delos — where music is born.`,
                })
              }
            />
            <IconButton
              icon="ellipsis-horizontal"
              label="Profile actions"
              onPress={() =>
                Alert.alert('Safety tools', undefined, [
                  {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                      await block(p.id);
                      router.back();
                    },
                  },
                  { text: 'Report', onPress: () => router.push(`/report/${p.id}`) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            />
          </View>
        }
      />
      <View style={[styles.hero, { backgroundColor: p.heroColor }]}>
        {photo && <Image source={photo} contentFit="cover" style={StyleSheet.absoluteFill} />}
        {!photo && (
          <>
            <View style={styles.disc} />
            <Text style={styles.initials}>{p.initials}</Text>
          </>
        )}
      </View>
      <Text style={styles.role}>
        {p.primaryInstrument} · {p.skill} · {p.location}
        {p.distanceKm === null ? '' : ` · ${p.distanceKm} km`}
      </Text>
      {c && <Text style={styles.explain}>{c.explanation}</Text>}
      <TrustSignals profile={p} />
      {isOwner && (
        <View style={styles.ownerActions}>
          <Button label="Edit profile" onPress={() => router.push('/edit-profile')} />
          <Button label="Manage media" variant="secondary" onPress={() => router.push('/media')} />
        </View>
      )}
      {c && (
        <Section title="Why you match">
          <CompatibilityBars factors={c.factors} factorDetails={c.factorDetails} />
        </Section>
      )}
      <Text style={styles.bio}>{p.bio}</Text>
      <Section title="Sound">
        <View style={styles.chips}>
          {[...new Set(p.genres)].map((x) => (
            <Chip key={x} label={x} />
          ))}
        </View>
        <Text style={styles.muted}>Influenced by {p.influences.join(', ')}</Text>
        {!!p.secondaryInstruments.length && (
          <Text style={styles.muted}>Also plays {p.secondaryInstruments.join(', ')}</Text>
        )}
      </Section>
      <Section title="Looking for">
        <View style={styles.chips}>
          {[...new Set(p.desiredRoles)].map((x) => (
            <Chip key={x} label={x} />
          ))}
        </View>
        <Text style={styles.muted}>
          {p.goals.join(' · ')} · {p.material}
        </Text>
      </Section>
      <Section title="Availability">
        <Text style={styles.text}>
          {p.availability.map((a) => `${a.day} ${a.periods.join('/')}`).join(' · ')}
        </Text>
        <Text style={styles.muted}>
          {p.rehearsalFrequency} · Travels {p.travelRadiusKm} km
        </Text>
      </Section>
      {!!performances.length && (
        <Section title="Performance">
          {performances.map((performance) =>
            performance.type === 'audio' ? (
              <AudioSamplePlayer
                key={performance.id}
                uri={performance.uri}
                title={performance.title}
              />
            ) : (
              <Pressable
                key={performance.id}
                accessibilityRole="button"
                disabled={!performance.uri}
                onPress={() => performance.uri && Linking.openURL(performance.uri)}
                style={styles.sample}
              >
                <Ionicons name="play" size={26} color={colors.accentInk} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sampleTitle}>{performance.title}</Text>
                  <Text style={styles.sampleMeta}>VIDEO · OPEN PERFORMANCE</Text>
                </View>
              </Pressable>
            ),
          )}
        </Section>
      )}
      {(p.existingBand || p.links.length > 0) && (
        <Section title="Projects & links">
          {!!p.existingBand && <Text style={styles.text}>Current project: {p.existingBand}</Text>}
          {p.links.map((link) => (
            <Pressable
              accessibilityRole="link"
              key={`${link.label}-${link.url}`}
              onPress={() => Linking.openURL(link.url)}
            >
              <Text style={styles.link}>{link.label} ↗</Text>
            </Pressable>
          ))}
        </Section>
      )}
      <View style={styles.facts}>
        <Fact icon="car" label={p.transportation ? 'Has transport' : 'No transport'} />
        <Fact
          icon="volume-high"
          label={p.performanceReadyGear ? 'Gig-ready gear' : 'Needs shared gear'}
        />
        <Fact icon="shield-checkmark" label={p.verifiedEmail ? 'Email verified' : 'Unverified'} />
      </View>
      {!isOwner && (
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button
              label="Pass"
              variant="secondary"
              onPress={async () => {
                await pass(p.id);
                router.back();
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Connect"
              icon="heart"
              onPress={async () => {
                await like(p.id);
                router.back();
              }}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}
function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Fact({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} color={colors.accent} size={18} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}
const factorLabels: Record<CompatibilityFactor, string> = {
  genre: 'Sound',
  role: 'Role fit',
  distance: 'Distance',
  schedule: 'Schedule',
  commitment: 'Commitment',
  goal: 'Goals',
};
function CompatibilityBars({
  factors,
  factorDetails,
}: {
  factors: Record<CompatibilityFactor, number>;
  factorDetails: Record<CompatibilityFactor, string>;
}) {
  return (
    <View style={styles.bars}>
      {(Object.keys(COMPATIBILITY_WEIGHTS) as CompatibilityFactor[]).map((name) => {
        const percent = Math.round((factors[name] / COMPATIBILITY_WEIGHTS[name]) * 100);
        return (
          <View key={name} style={styles.barItem}>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>{factorLabels[name]}</Text>
              <Text style={styles.points}>{percent}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${percent}%` }]} />
            </View>
            <Text style={styles.barDetail}>{factorDetails[name]}</Text>
          </View>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: 6 },
  ownerActions: { gap: 8 },
  link: { color: '#8B5000', fontWeight: '800', paddingVertical: 5 },
  bars: { gap: 16 },
  barItem: { gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  barDetail: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  track: { height: 7, backgroundColor: colors.line, borderRadius: 99, overflow: 'hidden' },
  fill: { height: 7, backgroundColor: colors.accent, borderRadius: 99 },
  points: { color: colors.text, fontSize: 12, fontWeight: '800' },
  hero: {
    height: 340,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disc: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 55,
    borderColor: 'rgba(0,0,0,.18)',
  },
  initials: { color: colors.accentInk, fontSize: 90, fontWeight: '900' },
  role: { color: colors.text, fontSize: 17, fontWeight: '800' },
  explain: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  bio: { color: colors.text, ...type.body },
  section: { gap: 10, borderTopWidth: 1, borderColor: colors.line, paddingTop: space.lg },
  sectionTitle: { color: colors.text, ...type.h2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { color: colors.muted, ...type.small },
  text: { color: colors.text, ...type.body },
  sample: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: space.md,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  sampleTitle: { color: colors.accentInk, fontWeight: '900' },
  sampleMeta: { color: '#5B3700', fontSize: 11, marginTop: 4 },
  wave: {
    width: 70,
    height: 28,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderColor: 'rgba(0,0,0,.25)',
  },
  facts: { gap: 10 },
  fact: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
});
