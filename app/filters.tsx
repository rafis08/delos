import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Header, Screen, SettingRow } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, space } from '@/theme';
import { DiscoveryPreferences } from '@/types';

const initial: DiscoveryPreferences = {
  maxDistanceKm: 50,
  ageMin: 18,
  ageMax: 50,
  instruments: [],
  genres: [],
  goals: [],
  commitment: [],
};
const toggle = <T extends string>(items: T[], item: T) =>
  items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
export default function Filters() {
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    repository
      ?.getDiscoveryPreferences()
      .then((nextPrefs) => nextPrefs && setPrefs(nextPrefs))
      .catch(() => setError('Could not load your saved preferences.'));
  }, []);
  const save = async () => {
    if (
      prefs.ageMin < 18 ||
      prefs.ageMax < prefs.ageMin ||
      prefs.maxDistanceKm < 1 ||
      prefs.maxDistanceKm > 250
    )
      return setError('Check the age range and distance.');
    if (!repository) return setError('Data service unavailable.');
    setSaving(true);
    setError('');
    try {
      await repository.saveDiscoveryPreferences(prefs);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen>
      <Header eyebrow="DISCOVERY" title="Tune your matches" />
      <Text style={styles.note}>
        Distance, age, blocks, and role compatibility are hard requirements. Other choices shape
        ranking.
      </Text>
      <Field
        label="Maximum distance (km)"
        value={String(prefs.maxDistanceKm)}
        onChangeText={(value) => setPrefs({ ...prefs, maxDistanceKm: Number(value) || 0 })}
        keyboardType="number-pad"
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Field
            label="Minimum age"
            value={String(prefs.ageMin)}
            onChangeText={(value) => setPrefs({ ...prefs, ageMin: Number(value) || 0 })}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.flex}>
          <Field
            label="Maximum age"
            value={String(prefs.ageMax)}
            onChangeText={(value) => setPrefs({ ...prefs, ageMax: Number(value) || 0 })}
            keyboardType="number-pad"
          />
        </View>
      </View>
      <Text style={styles.label}>Roles you need</Text>
      <Chips
        items={['Vocals', 'Guitar', 'Drums', 'Bass', 'Keys', 'Producer']}
        selected={prefs.instruments}
        onToggle={(item) => setPrefs({ ...prefs, instruments: toggle(prefs.instruments, item) })}
      />
      <Text style={styles.label}>Priority genres</Text>
      <Chips
        items={['Alternative Rock', 'Indie', 'Punk', 'R&B', 'Jazz', 'Electronic', 'Metal', 'Folk']}
        selected={prefs.genres}
        onToggle={(item) => setPrefs({ ...prefs, genres: toggle(prefs.genres, item) })}
      />
      <Text style={styles.label}>Goals</Text>
      <Chips
        items={['Casual jams', 'Form a band', 'Join a band', 'Session work', 'Paid gigs']}
        selected={prefs.goals}
        onToggle={(item) =>
          setPrefs({ ...prefs, goals: toggle(prefs.goals, item as (typeof prefs.goals)[number]) })
        }
      />
      <Text style={styles.label}>Commitment</Text>
      <Chips
        items={['Casual', 'Consistent', 'Serious', 'Professional']}
        selected={prefs.commitment}
        onToggle={(item) =>
          setPrefs({
            ...prefs,
            commitment: toggle(prefs.commitment, item as (typeof prefs.commitment)[number]),
          })
        }
      />
      <View style={styles.advanced}>
        <Text style={styles.advancedTitle}>PRACTICAL FIT</Text>
        <SettingRow
          icon="sunny"
          title="Available now only"
          subtitle="Prioritize musicians ready to make plans"
          value={Boolean(prefs.availableNowOnly)}
          onValueChange={(value) => setPrefs({ ...prefs, availableNowOnly: value })}
        />
        <SettingRow
          icon="car"
          title="Transportation required"
          value={Boolean(prefs.transportationRequired)}
          onValueChange={(value) => setPrefs({ ...prefs, transportationRequired: value })}
        />
        <SettingRow
          icon="volume-high"
          title="Performance-ready gear"
          value={Boolean(prefs.performanceReadyGearRequired)}
          onValueChange={(value) => setPrefs({ ...prefs, performanceReadyGearRequired: value })}
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button label={saving ? 'Saving…' : 'Apply preferences'} disabled={saving} onPress={save} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  note: { color: colors.muted, lineHeight: 20 },
  label: { color: colors.text, fontWeight: '800' },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  error: { color: colors.danger },
  advanced: {
    paddingHorizontal: space.md,
    borderRadius: 18,
    backgroundColor: '#FFF4CF',
    borderWidth: 1,
    borderColor: '#F2C35E',
  },
  advancedTitle: {
    color: '#8B5000',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.8,
    paddingTop: space.md,
  },
});
