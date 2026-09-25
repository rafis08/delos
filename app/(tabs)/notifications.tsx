import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MainTabScreen } from '@/components/MainTabScreen';
import { Header } from '@/components/ui';
import { useApp } from '@/store/AppContext';
import { colors, radius, space } from '@/theme';
export default function Notifications() {
  const { notifications, markNotificationsRead } = useApp();
  const unread = notifications.some((item) => !item.read);
  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(() => void markNotificationsRead(), 1200);
    return () => clearTimeout(t);
  }, [unread, markNotificationsRead]);
  return (
    <MainTabScreen tab="notifications">
      <Header eyebrow="WHAT'S HAPPENING" title="Activity" />
      {notifications.map((n) => (
        <View key={n.id} style={[styles.item, !n.read && styles.unread]}>
          <View style={styles.icon}>
            <Ionicons
              name={n.type === 'match' ? 'heart' : n.type === 'session' ? 'calendar' : 'chatbubble'}
              color={colors.accent}
              size={20}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.body}>{n.body}</Text>
            <Text style={styles.time}>{n.time}</Text>
          </View>
          {!n.read && <View style={styles.dot} />}
        </View>
      ))}
    </MainTabScreen>
  );
}
const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 13, padding: space.md, borderRadius: radius.md },
  unread: { backgroundColor: colors.panel },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text, fontWeight: '800' },
  body: { color: colors.muted, marginTop: 3 },
  time: { color: colors.muted, fontSize: 11, marginTop: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
