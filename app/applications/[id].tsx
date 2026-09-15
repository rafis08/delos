import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Header, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, radius, space } from '@/theme';
import { BandCallApplication } from '@/types';
export default function Applicants() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [items, setItems] = useState<BandCallApplication[] | null>(null);
  useEffect(() => {
    repository
      ?.listBandCallApplications(id)
      .then(setItems)
      .catch(() => setItems([]));
  }, [id]);
  const respond = async (item: BandCallApplication, status: 'invited' | 'declined') => {
    const conversation = await repository?.respondToBandCallApplication(item.id, status);
    setItems(
      (current) =>
        current?.map((value) => (value.id === item.id ? { ...value, status } : value)) || [],
    );
    if (conversation) router.push(`/chat/${conversation}`);
  };
  return (
    <Screen>
      <Header eyebrow="YOUR BAND CALL" title="Interested musicians" />
      {items === null ? (
        <StateView
          loading
          title="Loading responses"
          body="Finding musicians who raised their hand…"
        />
      ) : items.length === 0 ? (
        <StateView
          icon="people-outline"
          title="No responses yet"
          body="We’ll notify you when a musician is interested."
        />
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.person}>
              <Avatar
                initials={item.applicantName
                  .split(' ')
                  .map((x) => x[0])
                  .join('')}
                color={colors.accent}
              />
              <View>
                <Text style={styles.name}>{item.applicantName}</Text>
                <Text style={styles.instrument}>
                  {item.primaryInstrument} · {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.intro}>{item.intro}</Text>
            {item.status === 'pending' && (
              <View style={styles.actions}>
                <View style={styles.flex}>
                  <Button
                    label="Pass"
                    variant="secondary"
                    onPress={() => respond(item, 'declined')}
                  />
                </View>
                <View style={styles.flex}>
                  <Button label="Invite to chat" onPress={() => respond(item, 'invited')} />
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: space.lg, gap: 12 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: colors.text, fontWeight: '900', fontSize: 18 },
  instrument: { color: colors.muted, marginTop: 3 },
  intro: { color: colors.text, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
