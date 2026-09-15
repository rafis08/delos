import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Header, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, radius, space } from '@/theme';
import { MusicianProfile } from '@/types';
export default function Saved() {
  const [items, setItems] = useState<MusicianProfile[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      repository
        ?.listSavedProfiles()
        .then(setItems)
        .catch(() => setItems([]));
    }, []),
  );
  return (
    <Screen>
      <Header eyebrow="SHORTLIST" title="Musicians to revisit" />
      {items === null ? (
        <StateView loading title="Loading shortlist" body="Getting your saved musicians…" />
      ) : items.length === 0 ? (
        <StateView
          icon="bookmark-outline"
          title="Your shortlist is empty"
          body="Tap the bookmark while discovering to save someone without making a decision."
        />
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/profile/${item.id}`)}
            style={styles.row}
          >
            <Avatar initials={item.initials} color={item.heroColor} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.meta}>
                {item.primaryInstrument} · {item.genres.slice(0, 2).join(' / ')}
              </Text>
            </View>
            <Button
              label="Remove"
              variant="ghost"
              onPress={async () => {
                await repository?.removeSavedProfile(item.id);
                setItems((current) => current?.filter((value) => value.id !== item.id) || []);
              }}
            />
          </Pressable>
        ))
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  copy: { flex: 1 },
  name: { color: colors.text, fontWeight: '900', fontSize: 17 },
  meta: { color: colors.muted, marginTop: 4 },
});
