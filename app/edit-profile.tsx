import { router } from 'expo-router';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Chips, Field, Header, Screen } from '@/components/ui';
import { createBlankProfile } from '@/data/blankProfile';
import { profileSchema } from '@/domain/validation';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';
export default function EditProfile() {
  const { profile, updateProfile, userId } = useApp();
  const [p, setP] = useState(profile || createBlankProfile(userId || ''));
  const [error, setError] = useState('');
  const save = async () => {
    const v = profileSchema.safeParse(p);
    if (!v.success) {
      setError(v.error.issues[0]?.message || 'Check the form');
      return;
    }
    await updateProfile(p);
    router.back();
  };
  return (
    <Screen>
      <Header eyebrow="PROFILE" title="Edit your profile" />
      <Field
        label="Display name"
        value={p.displayName}
        onChangeText={(displayName) => setP({ ...p, displayName })}
      />
      <Field
        label="Age"
        value={String(p.age)}
        keyboardType="number-pad"
        onChangeText={(age) => setP({ ...p, age: Number(age) })}
      />
      <Field
        label="General location"
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
            return setError('Location permission was not granted.');
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
      <Text style={{ color: colors.text, fontWeight: '800' }}>Available now</Text>
      <Chips
        items={['Available now', 'Not right now']}
        selected={[p.availableNow ? 'Available now' : 'Not right now']}
        onToggle={(x) => setP({ ...p, availableNow: x === 'Available now' })}
      />
      <Field
        label="Travel radius (km)"
        value={String(p.travelRadiusKm)}
        keyboardType="number-pad"
        onChangeText={(x) => setP({ ...p, travelRadiusKm: Number(x) })}
      />
      <Button label="Save changes" onPress={save} />
    </Screen>
  );
}
