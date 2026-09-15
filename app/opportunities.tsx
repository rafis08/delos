import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, Header, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, radius, space, type } from '@/theme';
import { BandCall } from '@/types';
import { useApp } from '@/store/AppContext';
export default function BandCalls() {
  const { userId } = useApp();
  const [items, setItems] = useState<BandCall[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      repository
        ?.listBandCalls()
        .then(setItems)
        .catch(() => setItems([]));
    }, []),
  );
  return (
    <Screen>
      <Header
        eyebrow="BAND CALLS"
        title="Find the project, not just the person"
        right={<Button label="Post" onPress={() => router.push('/create-opportunity')} />}
      />
      {items === null ? (
        <StateView loading title="Loading band calls" body="Finding active projects nearby…" />
      ) : items.length === 0 ? (
        <StateView
          icon="megaphone-outline"
          title="No active calls"
          body="Post what you’re building and the roles you need."
        />
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/profile/${item.creatorId}`)}
            style={styles.card}
          >
            <View style={styles.line}>
              <Text style={styles.commitment}>{item.commitment.toUpperCase()}</Text>
              <Text style={styles.date}>{item.createdAt}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.chips}>
              {[...new Set(item.rolesNeeded)].map((role) => (
                <Chip key={role} label={`Needs ${role}`} />
              ))}
            </View>
            <Text style={styles.meta}>
              {item.creatorName} · {item.location} · {item.rehearsalFrequency}
            </Text>
            <Button
              label={item.creatorId === userId ? 'View applicants' : 'I’m interested'}
              variant={item.creatorId === userId ? 'secondary' : 'primary'}
              onPress={() =>
                router.push(
                  item.creatorId === userId ? `/applications/${item.id}` : `/apply/${item.id}`,
                )
              }
            />
          </Pressable>
        ))
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 10,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  commitment: { color: colors.accent, fontWeight: '900', fontSize: 11, letterSpacing: 0.7 },
  date: { color: colors.muted, fontSize: 11 },
  title: { color: colors.text, ...type.h2 },
  description: { color: colors.text, ...type.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { color: colors.muted, fontSize: 12 },
});
