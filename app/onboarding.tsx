import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Header, Screen } from '@/components/ui';
import { createBlankProfile } from '@/data/blankProfile';
import { profileSchema } from '@/domain/validation';
import { useApp } from '@/store/AppContext';
import { colors, radius, space, type } from '@/theme';
import { Commitment, Goal } from '@/types';

const instruments = [
  'Vocals',
  'Guitar',
  'Drums',
  'Bass',
  'Keys',
  'Saxophone',
  'Violin',
  'Producer',
];
const genres = [
  'Alternative Rock',
  'Indie',
  'Punk',
  'R&B',
  'Neo-soul',
  'Jazz',
  'Funk',
  'Electronic',
  'Pop',
  'Metal',
  'Folk',
  'Hip-hop',
];
const goals: Goal[] = ['Casual jams', 'Form a band', 'Join a band', 'Session work', 'Paid gigs'];
const commitments: Commitment[] = ['Casual', 'Consistent', 'Serious', 'Professional'];
const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
export default function Onboarding() {
  const { finishOnboarding, uploadMedia, userId } = useApp();
  const [step, setStep] = useState(0);
  const [p, setP] = useState(() => createBlankProfile(userId || ''));
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<{ uri: string; mimeType: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const next = () => {
    if (step === 0) {
      const v = profileSchema.safeParse(p);
      if (!v.success) {
        setError(v.error.issues[0]?.message || 'Complete each field');
        return;
      }
    }
    setError('');
    if (step < 4) setStep(step + 1);
    else {
      setSaving(true);
      finishOnboarding(p)
        .then(() =>
          Promise.all(picked.map((item) => uploadMedia(item.uri, item.mimeType, item.title))),
        )
        .then(() => router.replace('/(tabs)/discover'))
        .catch((cause) =>
          setError(cause instanceof Error ? cause.message : 'Could not save profile'),
        )
        .finally(() => setSaving(false));
    }
  };
  return (
    <Screen>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${(step + 1) * 20}%` }]} />
      </View>
      <Header
        eyebrow={`PROFILE SETUP · ${step + 1} OF 5`}
        title={
          [
            'First, the basics',
            'Build your sound',
            'What are you building?',
            'When can you play?',
            'Make it heard',
          ][step]!
        }
      />
      {step === 0 && (
        <>
          <View style={styles.photo}>
            <Ionicons name="person" size={42} color={colors.muted} />
            <Pressable
              onPress={async () => {
                const r = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  quality: 0.8,
                });
                if (!r.canceled) {
                  const asset = r.assets[0]!;
                  setPicked([
                    {
                      uri: asset.uri,
                      mimeType: asset.mimeType || 'image/jpeg',
                      title: 'Profile photo',
                    },
                    ...picked.filter((item) => item.title !== 'Profile photo'),
                  ]);
                }
              }}
            >
              <Text style={styles.link}>ADD PROFILE PHOTO</Text>
            </Pressable>
          </View>
          <Field
            label="Display name"
            value={p.displayName}
            onChangeText={(displayName) => setP({ ...p, displayName })}
          />
          <Field
            label="Age"
            value={String(p.age)}
            keyboardType="number-pad"
            onChangeText={(age) => setP({ ...p, age: Number(age) || 0 })}
          />
          <Field
            label="General location"
            value={p.location}
            onChangeText={(location) => setP({ ...p, location })}
          />
          <Button
            label="Use my approximate location"
            variant="secondary"
            icon="location-outline"
            onPress={async () => {
              const permission = await Location.requestForegroundPermissionsAsync();
              if (permission.status !== 'granted')
                return setError(
                  'Location permission was not granted. You can enter your city manually.',
                );
              const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              const places = await Location.reverseGeocodeAsync(position.coords);
              const place = places[0];
              setP({
                ...p,
                location: [place?.city, place?.region].filter(Boolean).join(', ') || p.location,
                approximateCoordinates: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
              });
            }}
          />
          <Field
            label="Bio"
            multiline
            value={p.bio}
            onChangeText={(bio) => setP({ ...p, bio })}
            error={error}
          />
          <Text style={styles.help}>Your exact address is never displayed.</Text>
        </>
      )}
      {step === 1 && (
        <>
          <Text style={styles.label}>Primary instrument</Text>
          <Chips
            items={instruments}
            selected={[p.primaryInstrument]}
            onToggle={(primaryInstrument) => setP({ ...p, primaryInstrument })}
          />
          <Text style={styles.label}>Genres</Text>
          <Chips
            items={genres}
            selected={p.genres}
            onToggle={(x) => setP({ ...p, genres: toggle(p.genres, x) })}
          />
          <Field
            label="Influences (comma separated)"
            value={p.influences.join(', ')}
            onChangeText={(x) =>
              setP({
                ...p,
                influences: x
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
          />
          <Text style={styles.label}>Skill level</Text>
          <Chips
            items={['Developing', 'Intermediate', 'Advanced', 'Professional']}
            selected={[p.skill]}
            onToggle={(skill) => setP({ ...p, skill: skill as typeof p.skill })}
          />
        </>
      )}
      {step === 2 && (
        <>
          <Text style={styles.label}>Goals</Text>
          <Chips
            items={goals}
            selected={p.goals}
            onToggle={(x) => setP({ ...p, goals: toggle(p.goals, x) as Goal[] })}
          />
          <Text style={styles.label}>Commitment</Text>
          <Chips
            items={commitments}
            selected={[p.commitment]}
            onToggle={(commitment) => setP({ ...p, commitment: commitment as Commitment })}
          />
          <Text style={styles.label}>Material</Text>
          <Chips
            items={['Originals', 'Covers', 'Both']}
            selected={[p.material]}
            onToggle={(material) => setP({ ...p, material: material as typeof p.material })}
          />
          <Text style={styles.label}>Roles you need</Text>
          <Chips
            items={instruments}
            selected={p.desiredRoles}
            onToggle={(x) => setP({ ...p, desiredRoles: toggle(p.desiredRoles, x) })}
          />
        </>
      )}
      {step === 3 && (
        <>
          <Text style={styles.label}>Weekly availability</Text>
          <View style={styles.schedule}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <Pressable
                key={day}
                style={[styles.day, p.availability.some((a) => a.day === day) && styles.dayOn]}
                onPress={() =>
                  setP({
                    ...p,
                    availability: p.availability.some((a) => a.day === day)
                      ? p.availability.filter((a) => a.day !== day)
                      : [...p.availability, { day: day as any, periods: ['Evening'] }],
                  })
                }
              >
                <Text
                  style={[
                    styles.dayText,
                    p.availability.some((a) => a.day === day) && { color: colors.accentInk },
                  ]}
                >
                  {day[0]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.help}>Selected days default to evening; refine them later.</Text>
          <Field
            label="Travel radius (km)"
            value={String(p.travelRadiusKm)}
            keyboardType="number-pad"
            onChangeText={(x) => setP({ ...p, travelRadiusKm: Number(x) || 0 })}
          />
          <Text style={styles.label}>Rehearsal rhythm</Text>
          <Chips
            items={['Monthly', 'Weekly', 'Twice weekly', 'Flexible']}
            selected={[p.rehearsalFrequency]}
            onToggle={(rehearsalFrequency) => setP({ ...p, rehearsalFrequency })}
          />
        </>
      )}
      {step === 4 && (
        <>
          <View style={styles.upload}>
            <Ionicons name="musical-notes" size={36} color={colors.accent} />
            <Text style={styles.uploadTitle}>Add a performance sample</Text>
            <Text style={styles.help}>Audio up to 25 MB · Video up to 100 MB</Text>
            <Button
              label="Choose audio or video"
              variant="secondary"
              onPress={async () => {
                const r = await DocumentPicker.getDocumentAsync({
                  type: ['audio/*', 'video/mp4', 'video/quicktime'],
                  multiple: false,
                });
                if (!r.canceled) {
                  const asset = r.assets[0]!;
                  const mimeType = asset.mimeType || 'audio/mpeg';
                  const limit = mimeType.startsWith('audio/')
                    ? 25 * 1024 * 1024
                    : 100 * 1024 * 1024;
                  if (asset.size && asset.size > limit) {
                    setError(
                      'That file is too large. Audio is limited to 25 MB and video to 100 MB.',
                    );
                    return;
                  }
                  setPicked([
                    ...picked,
                    { uri: asset.uri, mimeType, title: asset.name || 'Performance sample' },
                  ]);
                }
              }}
            />
          </View>
          {picked.map((x, i) => (
            <View key={`${x.uri}-${i}`} style={styles.file}>
              <Ionicons name="checkmark-circle" color={colors.accent} />
              <Text style={{ color: colors.text, flex: 1 }}>Media {i + 1} ready</Text>
            </View>
          ))}
          <Text style={styles.disclosure}>
            By publishing, you confirm you own or have permission to share these recordings. Your
            profile is visible to Delos members.
          </Text>
        </>
      )}
      <View style={styles.actions}>
        {step > 0 && <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} />}
        <View style={{ flex: 1 }}>
          <Button
            label={saving ? 'Publishing…' : step === 4 ? 'Start discovering' : 'Continue'}
            onPress={next}
            disabled={saving}
          />
        </View>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  progress: { height: 4, backgroundColor: colors.line, borderRadius: 4 },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 4 },
  photo: {
    height: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  link: { color: colors.accent, fontWeight: '900', fontSize: 12 },
  label: { color: colors.text, fontWeight: '800', fontSize: 15 },
  help: { color: colors.muted, ...type.small },
  schedule: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  dayOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayText: { color: colors.text, fontWeight: '800' },
  upload: {
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    alignItems: 'center',
    gap: 12,
  },
  uploadTitle: { color: colors.text, ...type.h2 },
  file: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
  },
  disclosure: { color: colors.muted, ...type.small },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
