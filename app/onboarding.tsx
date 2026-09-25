import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Header, Screen } from '@/components/ui';
import { AudioSamplePlayer } from '@/components/AudioSamplePlayer';
import { createBlankProfile } from '@/data/blankProfile';
import { mediaRules, profileBasicsSchema, profileSchema } from '@/domain/validation';
import { friendlyProfileIssue } from '@/domain/profileMessages';
import {
  commaList,
  genreOptions,
  influenceSuggestions,
  instrumentOptions,
} from '@/domain/profileOptions';
import { useApp } from '@/store/AppContext';
import { colors, radius, space, type } from '@/theme';
import { Commitment, Goal } from '@/types';

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
  const [influencesText, setInfluencesText] = useState('');
  const [genreQuery, setGenreQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const profilePhoto = picked.find((item) => item.title === 'Profile photo');
  const next = async () => {
    const nextProfile = { ...p, influences: commaList(influencesText) };
    if (step === 0) {
      const v = profileBasicsSchema.safeParse(nextProfile);
      if (!v.success) {
        setError(friendlyProfileIssue(v.error.issues[0]));
        return;
      }
    }
    if (step === 1 && !nextProfile.genres.length)
      return setError('Choose at least one genre that represents your sound.');
    if (step === 2 && !nextProfile.goals.length)
      return setError('Choose at least one goal for what you want to do on Delos.');
    if (step === 2 && !nextProfile.desiredRoles.length)
      return setError('Choose at least one musician or role you want to meet.');
    if (step === 3 && !nextProfile.availability.length)
      return setError('Choose at least one day you are usually available.');
    setP(nextProfile);
    setError('');
    if (step < 4) {
      setStep(step + 1);
    } else {
      const completed = {
        ...nextProfile,
        initials: nextProfile.displayName
          .split(/\s+/)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      };
      const validation = profileSchema.safeParse(completed);
      if (!validation.success) {
        setError(friendlyProfileIssue(validation.error.issues[0]));
        return;
      }
      setSaving(true);
      try {
        await finishOnboarding(completed);
        const failed: string[] = [];
        for (const item of picked) {
          try {
            await uploadMedia(item.uri, item.mimeType, item.title);
          } catch {
            failed.push(item.title);
          }
        }
        router.replace('/(tabs)/discover');
        if (failed.length)
          Alert.alert(
            'Profile published',
            'Your profile is live, but one media file did not upload. You can add it again from Profile media.',
          );
      } catch (cause) {
        const raw = cause instanceof Error ? cause.message : '';
        setError(
          raw.toLowerCase().includes('row-level security')
            ? 'Your session expired. Sign in again and retry.'
            : raw || 'Your profile could not be published. Check your connection and try again.',
        );
      } finally {
        setSaving(false);
      }
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
            {profilePhoto ? (
              <Image source={profilePhoto.uri} contentFit="cover" style={styles.photoPreview} />
            ) : (
              <Ionicons name="person" size={42} color={colors.muted} />
            )}
            <Pressable
              style={profilePhoto && styles.photoReplace}
              onPress={async () => {
                const r = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  quality: 0.8,
                });
                if (!r.canceled) {
                  const asset = r.assets[0]!;
                  const mimeType = asset.mimeType || 'image/jpeg';
                  if (
                    !mediaRules.image.types.includes(mimeType as never) ||
                    (asset.fileSize && asset.fileSize > mediaRules.image.maxBytes)
                  ) {
                    setError('Choose a JPEG, PNG, or WebP image smaller than 10 MB.');
                    return;
                  }
                  setPicked([
                    {
                      uri: asset.uri,
                      mimeType,
                      title: 'Profile photo',
                    },
                    ...picked.filter((item) => item.title !== 'Profile photo'),
                  ]);
                }
              }}
            >
              <Text style={[styles.link, profilePhoto && styles.photoReplaceText]}>
                {profilePhoto ? 'CHANGE PHOTO' : 'ADD PROFILE PHOTO'}
              </Text>
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
            placeholder="Your sound, experience, and what you want to make…"
            maxLength={500}
          />
          <Text style={styles.counter}>{p.bio.length}/500 · minimum 20</Text>
          <Text style={styles.help}>Your exact address is never displayed.</Text>
        </>
      )}
      {step === 1 && (
        <>
          <Text style={styles.label}>Primary instrument</Text>
          <Chips
            items={instrumentOptions}
            selected={[p.primaryInstrument]}
            onToggle={(primaryInstrument) => setP({ ...p, primaryInstrument })}
          />
          <Text style={styles.label}>Genres</Text>
          <Field
            label="Find a genre"
            value={genreQuery}
            onChangeText={setGenreQuery}
            placeholder="Search rock, jazz, house…"
          />
          <Chips
            items={genreOptions.filter((genre) =>
              genre.toLowerCase().includes(genreQuery.trim().toLowerCase()),
            )}
            selected={p.genres}
            onToggle={(x) => setP({ ...p, genres: toggle(p.genres, x) })}
          />
          {!!p.genres.length && <Text style={styles.help}>Selected: {p.genres.join(' · ')}</Text>}
          <Field
            label="Musical influences"
            value={influencesText}
            onChangeText={setInfluencesText}
            placeholder="Type artists, records, scenes, or eras separated by commas"
          />
          <Text style={styles.help}>
            Tap a suggestion or type your own. Separate each with a comma.
          </Text>
          <Chips
            items={influenceSuggestions}
            selected={commaList(influencesText)}
            onToggle={(influence) =>
              setInfluencesText(toggle(commaList(influencesText), influence).join(', '))
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
            items={instrumentOptions}
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
                  const kind = mimeType.startsWith('audio/') ? 'audio' : 'video';
                  const rule = mediaRules[kind];
                  if (
                    !rule.types.includes(mimeType as never) ||
                    (asset.size && asset.size > rule.maxBytes)
                  ) {
                    setError(
                      'Choose an MP3, M4A, WAV, MP4, or MOV within the displayed size limits.',
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
              {x.mimeType.startsWith('image/') ? (
                <Image source={x.uri} contentFit="cover" style={styles.fileImage} />
              ) : x.mimeType.startsWith('audio/') ? (
                <View style={styles.filePlayer}>
                  <AudioSamplePlayer uri={x.uri} title={x.title} />
                </View>
              ) : (
                <View style={styles.fileVideo}>
                  <Ionicons name="videocam" size={22} color={colors.accent} />
                  <Text numberOfLines={1} style={styles.fileTitle}>
                    {x.title}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${x.title}`}
                onPress={() => setPicked((items) => items.filter((_, index) => index !== i))}
                style={styles.removeMedia}
              >
                <Ionicons name="close" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ))}
          <Text style={styles.disclosure}>
            By publishing, you confirm you own or have permission to share these recordings. Your
            profile is visible to Delos members.
          </Text>
        </>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <View style={styles.actions}>
        {step > 0 && <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} />}
        <View style={{ flex: 1 }}>
          <Button
            label={saving ? 'Publishing…' : step === 4 ? 'Start discovering' : 'Continue'}
            onPress={() => void next()}
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
    overflow: 'hidden',
  },
  photoPreview: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  photoReplace: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,.94)',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  photoReplaceText: { color: '#7A4500' },
  link: { color: colors.accent, fontWeight: '900', fontSize: 12 },
  label: { color: colors.text, fontWeight: '800', fontSize: 15 },
  help: { color: colors.muted, ...type.small },
  counter: { color: colors.muted, fontSize: 11, textAlign: 'right', marginTop: -14 },
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
    minHeight: 76,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  fileImage: { width: '100%', height: 150 },
  filePlayer: { padding: 10, paddingRight: 42 },
  fileVideo: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  fileTitle: { color: colors.text, flex: 1, fontWeight: '800' },
  removeMedia: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.94)',
  },
  disclosure: { color: colors.muted, ...type.small },
  error: {
    color: colors.danger,
    backgroundColor: '#FFF0EE',
    padding: space.md,
    borderRadius: radius.md,
    fontWeight: '700',
    lineHeight: 20,
  },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
