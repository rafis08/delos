import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MainTabScreen } from '@/components/MainTabScreen';
import { Avatar, Header, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, space } from '@/theme';
import { Conversation } from '@/types';
export default function Messages() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  useEffect(() => {
    if (!repository) {
      setItems([]);
      return;
    }
    repository
      .listConversations()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  return (
    <MainTabScreen tab="messages" scroll={false}>
      <Header eyebrow="KEEP IT MOVING" title="Messages" />
      {items === null ? (
        <StateView loading title="Loading conversations" body="Getting the latest…" />
      ) : items.length === 0 ? (
        <StateView
          icon="chatbubbles-outline"
          title="No messages yet"
          body="Match with a musician and start planning something."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          renderItem={({ item }) => {
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/chat/${item.id}`)}
                style={styles.row}
              >
                <Avatar initials={item.initials || '?'} color={item.heroColor || colors.accent} />
                <View style={{ flex: 1 }}>
                  <View style={styles.line}>
                    <Text style={styles.name}>{item.displayName || 'Musician'}</Text>
                    <Text style={styles.time}>{item.updatedAt}</Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.preview,
                      item.unread > 0 && { color: colors.text, fontWeight: '700' },
                    ]}
                  >
                    {item.lastMessage}
                  </Text>
                </View>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </MainTabScreen>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  time: { color: colors.muted, fontSize: 12 },
  preview: { color: colors.muted, marginTop: 5 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.accentInk, fontSize: 12, fontWeight: '900' },
});
