import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Header, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, radius, space } from '@/theme';
import { Conversation } from '@/types';

export default function Matches() {
  const [list, setList] = useState<Conversation[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!repository) {
      setError('Supabase is not configured.');
      setList([]);
      return;
    }
    repository
      .listConversations()
      .then(setList)
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Could not load matches');
        setList([]);
      });
  }, []);
  return (
    <Screen scroll={false}>
      <Header eyebrow="MUTUAL INTEREST" title="Matches" />
      {list === null ? (
        <StateView loading title="Loading matches" body="Checking for mutual interest…" />
      ) : error ? (
        <StateView icon="warning-outline" title="Matches unavailable" body={error} />
      ) : list.length === 0 ? (
        <StateView
          icon="people-outline"
          title="No matches yet"
          body="When someone you like likes you back, they’ll appear here."
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/chat/${item.id}`)} style={styles.row}>
              <Avatar
                initials={item.initials || '?'}
                color={item.heroColor || colors.accent}
                size={64}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.displayName || 'Musician'}</Text>
                <Text style={styles.meta}>{item.lastMessage}</Text>
                <Text style={styles.match}>MUTUAL MATCH</Text>
              </View>
              <Text style={styles.say}>
                {item.unread > 0
                  ? 'Reply now →'
                  : item.lastMessage === 'You matched — say hello.'
                    ? 'Say hi →'
                    : 'Next step →'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    padding: space.md,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  meta: { color: colors.muted, marginTop: 3 },
  match: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 7,
    letterSpacing: 0.6,
  },
  say: { color: colors.text, fontWeight: '700' },
});
