import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Header, Screen, StateView } from '@/components/ui';
import { supabase } from '@/data/repository';
import { colors, radius, space } from '@/theme';
type QueueItem = {
  id: string;
  reported_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};
export default function Moderation() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    supabase?.rpc('moderation_queue').then(({ data, error: loadError }) => {
      if (loadError) setError(loadError.message);
      setItems((data || []) as QueueItem[]);
    });
  }, []);
  const resolve = async (id: string, resolution: 'dismissed' | 'actioned') => {
    const { error: resolveError } = await supabase!.rpc('resolve_report', {
      report_id: id,
      resolution,
    });
    if (resolveError) return setError(resolveError.message);
    setItems(
      (current) =>
        current?.map((item) => (item.id === id ? { ...item, status: resolution } : item)) || [],
    );
  };
  if (items === null)
    return (
      <Screen scroll={false}>
        <StateView
          loading
          title="Loading moderation queue"
          body="Checking access and open reports…"
        />
      </Screen>
    );
  return (
    <Screen>
      <Header eyebrow="TRUST & SAFETY" title="Moderation queue" />
      <Text style={styles.note}>
        This screen returns reports only for accounts assigned the moderator or admin role.
      </Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {items.length === 0 ? (
        <StateView
          icon="shield-checkmark"
          title="Queue clear"
          body="There are no reports available for this account."
        />
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.reason}>{item.reason}</Text>
            <Text style={styles.detail}>{item.details || 'No additional details'}</Text>
            <Text style={styles.meta}>
              {item.status} · {new Date(item.created_at).toLocaleString()}
            </Text>
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button
                  label="Dismiss"
                  variant="secondary"
                  onPress={() => resolve(item.id, 'dismissed')}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label="Actioned"
                  variant="danger"
                  onPress={() => resolve(item.id, 'actioned')}
                />
              </View>
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  note: { color: colors.muted },
  error: { color: colors.danger },
  card: { backgroundColor: colors.panel, borderRadius: radius.md, padding: space.md, gap: 8 },
  reason: { color: colors.text, fontWeight: '900', fontSize: 17 },
  detail: { color: colors.text },
  meta: { color: colors.muted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
