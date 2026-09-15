import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Header, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, radius, space } from '@/theme';
import { MusicianProfile } from '@/types';
export default function Blocked() {
  const [items, setItems] = useState<MusicianProfile[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    repository
      ?.listBlocked()
      .then(setItems)
      .catch(() => {
        setError('Could not load blocked members.');
        setItems([]);
      });
  }, []);
  if (items === null)
    return (
      <Screen scroll={false}>
        <StateView loading title="Loading blocked members" body="Reviewing your safety settings…" />
      </Screen>
    );
  return (
    <Screen>
      <Header eyebrow="PRIVACY" title="Blocked members" />
      {!!error && <Text style={styles.error}>{error}</Text>}
      {items.length === 0 ? (
        <StateView
          icon="shield-checkmark"
          title="No blocked members"
          body="Anyone you block will appear here."
        />
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Avatar initials={item.initials} color={item.heroColor} />
            <Text style={styles.name}>{item.displayName}</Text>
            <Button
              label="Unblock"
              variant="secondary"
              onPress={async () => {
                await repository?.unblock(item.id);
                setItems((list) => list?.filter((value) => value.id !== item.id) || []);
              }}
            />
          </View>
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
    backgroundColor: colors.panel,
    borderRadius: radius.md,
  },
  name: { flex: 1, color: colors.text, fontWeight: '800' },
  error: { color: colors.danger },
});
