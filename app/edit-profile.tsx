import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Header, Screen } from '@/components/ui';
import { createBlankProfile } from '@/data/blankProfile';
import {
  commaList,
  commitmentOptions,
  dayOptions,
  genreOptions,
  goalOptions,
  instrumentOptions,
  periodOptions,
  skillOptions,
  toggleValue,
} from '@/domain/profileOptions';
import { profileSchema } from '@/domain/validation';
import { useApp } from '@/store/AppContext';
import { colors, radius, space, type } from '@/theme';
import { Availability, Commitment, Day, Goal, Skill } from '@/types';

function Section({
  title,
  body,
  children,
}: React.PropsWithChildren<{ title: string; body?: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!body && <Text style={styles.help}>{body}</Text>}
      {children}
    </View>
  );
}

const linkLabel = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Music link';
  }
};

export default function EditProfile() {
  const { profile, updateProfile, userId } = useApp();
  const [p, setP] = useState(profile || createBlankProfile(userId || ''));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateAvailability = (day: Day, period: (typeof periodOptions)[number]) => {
    const existing = p.availability.find((item) => item.day === day);
    const periods = toggleValue(existing?.periods || [], period);
    const availability: Availability[] = periods.length
      ? [...p.availability.filter((item) => item.day !== day), { day, periods }]
      : p.availability.filter((item) => item.day !== day);
    setP({ ...p, availability });
  };

  const save = async () => {
    const next = {
      ...p,
      initials: p.displayName
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    };
    const validation = profileSchema.safeParse(next);
    if (!validation.success)
      return setError(validation.error.issues[0]?.message || 'Check the form.');
    try {
      setSaving(true);
      setError('');
      await updateProfile(next);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header eyebrow="YOUR MUSICIAN PROFILE" title="Show people how you work." />
      <Text style={styles.intro}>
        These details power your match score and help musicians decide whether the fit is real. Your
        exact address and private email are never shown.
      </Text>

      <Section title="Basics" body="The public essentials other members see.">
        <Field
          label="Display name"
          value={p.displayName}
          maxLength={50}
          onChangeText={(displayName) => setP({ ...p, displayName })}
        />
        <Field
          label="Age"
          value={String(p.age || '')}
          keyboardType="number-pad"
          onChangeText={(age) => setP({ ...p, age: Number(age) || 0 })}
        />
        <Field
          label="General location (city or area only)"
          value={p.location}
          onChangeText={(location) => setP({ ...p, location })}
        />
        <Button
          label="Refresh approximate location"
          variant="secondary"
          icon="location-outline"
          onPress={async () => {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted')
              return setError('Location permission was not granted. Enter your city manually.');
            const position = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            const place = (await Location.reverseGeocodeAsync(position.coords))[0];
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
          label="Biography"
          multiline
          maxLength={500}
          value={p.bio}
          placeholder="Describe your sound, experience, and the people you want to make music with."
          onChangeText={(bio) => setP({ ...p, bio })}
        />
        <Text style={styles.counter}>{p.bio.length}/500</Text>
      </Section>

      <Section title="Your sound" body="Be specific—this directly improves recommendations.">
        <Text style={styles.label}>Primary instrument or role</Text>
        <Chips
          items={instrumentOptions}
          selected={[p.primaryInstrument]}
          onToggle={(primaryInstrument) => setP({ ...p, primaryInstrument })}
        />
        <Field
          label="Custom primary instrument"
          value={instrumentOptions.includes(p.primaryInstrument) ? '' : p.primaryInstrument}
          placeholder="e.g. Cello, pedal steel, mixing engineer"
          onChangeText={(primaryInstrument) => setP({ ...p, primaryInstrument })}
        />
        <Field
          label="Secondary instruments (comma separated)"
          value={p.secondaryInstruments.join(', ')}
          placeholder="Vocals, keys, production"
          onChangeText={(value) => setP({ ...p, secondaryInstruments: commaList(value) })}
        />
        <Text style={styles.label}>Genres</Text>
        <Chips
          items={genreOptions}
          selected={p.genres}
          onToggle={(genre) => setP({ ...p, genres: toggleValue(p.genres, genre) })}
        />
        <Field
          label="Genres not listed (comma separated)"
          value={p.genres.filter((genre) => !genreOptions.includes(genre)).join(', ')}
          placeholder="Shoegaze, gospel, hardcore"
          onChangeText={(value) =>
            setP({
              ...p,
              genres: [
                ...p.genres.filter((genre) => genreOptions.includes(genre)),
                ...commaList(value),
              ],
            })
          }
        />
        <Field
          label="Musical influences (comma separated)"
          value={p.influences.join(', ')}
          placeholder="Artists, scenes, records, or eras"
          onChangeText={(value) => setP({ ...p, influences: commaList(value) })}
        />
        <Text style={styles.label}>Skill level</Text>
        <Chips
          items={skillOptions}
          selected={[p.skill]}
          onToggle={(skill) => setP({ ...p, skill: skill as Skill })}
        />
        <Field
          label="Years of experience"
          value={String(p.yearsExperience || '')}
          keyboardType="number-pad"
          onChangeText={(value) => setP({ ...p, yearsExperience: Number(value) || 0 })}
        />
      </Section>

      <Section title="What you want" body="Set expectations before anyone sends a message.">
        <Text style={styles.label}>Goals</Text>
        <Chips
          items={goalOptions}
          selected={p.goals}
          onToggle={(goal) => setP({ ...p, goals: toggleValue(p.goals, goal as Goal) })}
        />
        <Text style={styles.label}>Roles you want to meet</Text>
        <Chips
          items={instrumentOptions}
          selected={p.desiredRoles}
          onToggle={(role) => setP({ ...p, desiredRoles: toggleValue(p.desiredRoles, role) })}
        />
        <Field
          label="Additional desired roles"
          value={p.desiredRoles.filter((role) => !instrumentOptions.includes(role)).join(', ')}
          placeholder="Cellist, DJ, horn section"
          onChangeText={(value) =>
            setP({
              ...p,
              desiredRoles: [
                ...p.desiredRoles.filter((role) => instrumentOptions.includes(role)),
                ...commaList(value),
              ],
            })
          }
        />
        <Text style={styles.label}>Commitment level</Text>
        <Chips
          items={commitmentOptions}
          selected={[p.commitment]}
          onToggle={(commitment) => setP({ ...p, commitment: commitment as Commitment })}
        />
        <Text style={styles.label}>Originals or covers</Text>
        <Chips
          items={['Originals', 'Covers', 'Both']}
          selected={[p.material]}
          onToggle={(material) => setP({ ...p, material: material as typeof p.material })}
        />
        <Text style={styles.label}>Ideal rehearsal rhythm</Text>
        <Chips
          items={['Monthly', 'Weekly', 'Twice weekly', 'Flexible']}
          selected={[p.rehearsalFrequency]}
          onToggle={(rehearsalFrequency) => setP({ ...p, rehearsalFrequency })}
        />
      </Section>

      <Section title="Weekly availability" body="Choose every time window you can usually protect.">
        {dayOptions.map((day) => (
          <View key={day} style={styles.availabilityRow}>
            <Text style={styles.day}>{day}</Text>
            <Chips
              items={[...periodOptions]}
              selected={p.availability.find((item) => item.day === day)?.periods || []}
              onToggle={(period) =>
                updateAvailability(day, period as (typeof periodOptions)[number])
              }
            />
          </View>
        ))}
      </Section>

      <Section title="Logistics" body="The practical details that make rehearsals happen.">
        <Field
          label="Travel radius (km)"
          value={String(p.travelRadiusKm || '')}
          keyboardType="number-pad"
          onChangeText={(value) => setP({ ...p, travelRadiusKm: Number(value) || 0 })}
        />
        <Text style={styles.label}>Transportation</Text>
        <Chips
          items={['I have transportation', 'I need a ride or transit']}
          selected={[p.transportation ? 'I have transportation' : 'I need a ride or transit']}
          onToggle={(value) => setP({ ...p, transportation: value === 'I have transportation' })}
        />
        <Text style={styles.label}>Performance-ready equipment</Text>
        <Chips
          items={['I have gig-ready gear', 'I rely on shared gear']}
          selected={[p.performanceReadyGear ? 'I have gig-ready gear' : 'I rely on shared gear']}
          onToggle={(value) =>
            setP({ ...p, performanceReadyGear: value === 'I have gig-ready gear' })
          }
        />
        <Field
          label="Current band or project (optional)"
          value={p.existingBand || ''}
          placeholder="Band name or a short description"
          onChangeText={(existingBand) => setP({ ...p, existingBand: existingBand || undefined })}
        />
        <Text style={styles.label}>Current availability</Text>
        <Chips
          items={['Available now', 'Not right now']}
          selected={[p.availableNow ? 'Available now' : 'Not right now']}
          onToggle={(value) => setP({ ...p, availableNow: value === 'Available now' })}
        />
      </Section>

      <Section
        title="Public music links"
        body="Add one full URL per line. Your email stays private."
      >
        <Field
          label="Spotify, Bandcamp, SoundCloud, YouTube, or website"
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={p.links.map((link) => link.url).join('\n')}
          placeholder={'https://bandcamp.com/yourname\nhttps://youtube.com/@yourname'}
          onChangeText={(value) =>
            setP({
              ...p,
              links: value
                .split(/\n+/)
                .map((url) => url.trim())
                .filter(Boolean)
                .map((url) => ({ label: linkLabel(url), url })),
            })
          }
        />
      </Section>

      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button
        label={saving ? 'Saving profile…' : 'Save profile'}
        disabled={saving}
        onPress={() => void save()}
      />
      <Button
        label="Manage photos and performance samples"
        variant="secondary"
        icon="musical-notes"
        onPress={() => router.push('/media')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, ...type.body },
  section: {
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.raised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionTitle: { color: colors.text, ...type.h2 },
  label: { color: colors.text, fontWeight: '800', fontSize: 15 },
  help: { color: colors.muted, ...type.small },
  counter: { color: colors.muted, fontSize: 11, textAlign: 'right', marginTop: -10 },
  availabilityRow: {
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  day: { color: colors.text, fontWeight: '900' },
  error: {
    color: colors.danger,
    backgroundColor: '#FFF0EE',
    padding: space.md,
    borderRadius: radius.md,
    fontWeight: '700',
  },
});
