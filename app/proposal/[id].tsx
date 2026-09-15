import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Chips, Field, Header, Screen } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, radius, space } from '@/theme';
export default function Proposal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [kind, setKind] = useState('Rehearsal');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [songs, setSongs] = useState(['', '', '']);
  const send = async () => {
    const startsAt = new Date(`${date}T${time}`);
    if (
      songs.some((x) => !x.trim()) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}$/.test(time) ||
      !location ||
      Number.isNaN(startsAt.getTime()) ||
      startsAt <= new Date()
    ) {
      Alert.alert(
        'Complete the proposal',
        'Use a future date (YYYY-MM-DD), time (HH:MM), location, and three songs.',
      );
      return;
    }
    if (!repository) return Alert.alert('Connection unavailable', 'Supabase is not configured.');
    await repository.createProposal({
      conversationId: id,
      kind: kind as 'Rehearsal' | 'Audition',
      date,
      time,
      location,
      songs,
    });
    void repository.trackEvent('session_proposed', { conversationId: id }).catch(() => undefined);
    Alert.alert('Proposal sent', 'They can accept or decline it in the conversation.', [
      { text: 'Done', onPress: () => router.back() },
    ]);
  };
  return (
    <Screen>
      <Header eyebrow="MAKE IT REAL" title="Plan a session" />
      <Text style={styles.intro}>
        Move from messages to music. Keep the location public or studio-based until you’re
        comfortable.
      </Text>
      <Chips items={['Rehearsal', 'Audition']} selected={[kind]} onToggle={setKind} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="Date" placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Time" placeholder="19:00" value={time} onChangeText={setTime} />
        </View>
      </View>
      <Field label="Location" value={location} onChangeText={setLocation} />
      <View style={styles.set}>
        <Text style={styles.title}>Three-song set</Text>
        {songs.map((song, i) => (
          <Field
            key={i}
            label={`Song ${i + 1}`}
            value={song}
            onChangeText={(v) => setSongs(songs.map((x, j) => (i === j ? v : x)))}
          />
        ))}
      </View>
      <Button label="Send proposal" icon="paper-plane" onPress={send} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  intro: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: 'row', gap: 10 },
  set: { padding: space.md, backgroundColor: colors.panel, borderRadius: radius.lg, gap: 12 },
  title: { color: colors.text, fontWeight: '900', fontSize: 18 },
});
