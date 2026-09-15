import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, Header, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, radius, space } from '@/theme';
import { CollaborationItem } from '@/types';

const sections: { type: CollaborationItem['type']; title: string; empty: string }[] = [
  { type: 'song', title: 'SETLIST', empty: 'Add songs you want to try together.' },
  { type: 'task', title: 'TO-DO', empty: 'Keep rehearsal prep from getting lost in chat.' },
  { type: 'note', title: 'NOTES', empty: 'Save keys, tempos, references, and ideas.' },
];

export default function BandRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [items, setItems] = useState<CollaborationItem[] | null>(null);
  const [type, setType] = useState<CollaborationItem['type']>('song');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const actionable = useMemo(() => items?.filter((item) => item.type !== 'note') || [], [items]);
  const completed = actionable.filter((item) => item.completed).length;

  useEffect(() => {
    repository
      ?.listCollaborationItems(id)
      .then(setItems)
      .catch(() => {
        setItems([]);
        setError('The Band Room could not load.');
      });
  }, [id]);

  const add = async () => {
    if (!text.trim()) return setError('Add a song, task, or note first.');
    try {
      const item = await repository?.addCollaborationItem(id, type, text);
      if (item) setItems((current) => [...(current || []), item]);
      setText('');
      setError('');
    } catch {
      setError('That item could not be added.');
    }
  };

  const toggle = async (item: CollaborationItem) => {
    const completed = !item.completed;
    setItems((current) => current?.map((x) => (x.id === item.id ? { ...x, completed } : x)) || []);
    try {
      await repository?.toggleCollaborationItem(item.id, completed);
    } catch {
      setItems((current) => current?.map((x) => (x.id === item.id ? item : x)) || []);
    }
  };

  const remove = async (item: CollaborationItem) => {
    setItems((current) => current?.filter((x) => x.id !== item.id) || []);
    try {
      await repository?.deleteCollaborationItem(item.id);
    } catch {
      setItems((current) => [...(current || []), item]);
    }
  };

  return (
    <Screen>
      <Header eyebrow="YOUR SHARED WORKSPACE" title="Band Room" />
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="people" size={23} color={colors.accentInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Turn the match into music.</Text>
          <Text style={styles.heroBody}>
            Build a set, divide the prep, and walk into rehearsal ready.
          </Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {completed} of {actionable.length} prep items done
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${actionable.length ? (completed / actionable.length) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>
      <View style={styles.composer}>
        <View style={styles.types}>
          {sections.map((section) => (
            <Chip
              key={section.type}
              label={section.title}
              selected={type === section.type}
              onPress={() => setType(section.type)}
            />
          ))}
        </View>
        <TextInput
          accessibilityLabel={`Add ${type}`}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => void add()}
          placeholder={
            type === 'song'
              ? 'Song title'
              : type === 'task'
                ? 'What needs doing?'
                : 'Save a musical note'
          }
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Button label={`Add ${type}`} icon="add" onPress={() => void add()} />
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
      {items === null ? (
        <StateView loading title="Opening Band Room" body="Getting your shared prep…" />
      ) : (
        sections.map((section) => {
          const sectionItems = items.filter((item) => item.type === section.type);
          return (
            <View key={section.type} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {sectionItems.length === 0 ? (
                <Text style={styles.empty}>{section.empty}</Text>
              ) : (
                sectionItems.map((item) => (
                  <View key={item.id} style={styles.item}>
                    <Pressable
                      accessibilityRole={item.type === 'note' ? undefined : 'checkbox'}
                      accessibilityState={
                        item.type === 'note' ? undefined : { checked: item.completed }
                      }
                      onPress={() => item.type !== 'note' && void toggle(item)}
                      style={styles.itemMain}
                    >
                      <Ionicons
                        name={
                          item.type === 'note'
                            ? 'musical-note'
                            : item.completed
                              ? 'checkmark-circle'
                              : 'ellipse-outline'
                        }
                        size={22}
                        color={item.completed ? colors.accent : colors.muted}
                      />
                      <Text style={[styles.itemText, item.completed && styles.done]}>
                        {item.text}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Remove ${item.text}`}
                      onPress={() => void remove(item)}
                      hitSlop={10}
                    >
                      <Ionicons name="close" size={19} color={colors.muted} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: 13,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFF4D2',
    borderWidth: 1,
    borderColor: '#F2C35E',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  heroTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  heroBody: { color: colors.muted, lineHeight: 19, marginTop: 3 },
  progressRow: { gap: 7 },
  progressText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.raised },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  composer: {
    gap: 10,
    padding: space.md,
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  input: {
    minHeight: 48,
    paddingHorizontal: 15,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    backgroundColor: colors.ink,
  },
  error: { color: colors.danger, fontSize: 12 },
  section: { gap: 8 },
  sectionTitle: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  empty: { color: colors.muted, fontStyle: 'italic', paddingVertical: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemText: { flex: 1, color: colors.text, fontWeight: '700', lineHeight: 20 },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
});
