import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Button, Header, Screen, SettingRow } from '@/components/ui';
import { repository } from '@/data/repository';
import { useApp } from '@/store/AppContext';
import { colors, radius, space } from '@/theme';
import { SubscriptionTier } from '@/types';
export default function Settings() {
  const { settings, updateSettings, signOut, deleteAccount } = useApp();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  useEffect(() => {
    repository
      ?.getSubscriptionTier()
      .then(setTier)
      .catch(() => undefined);
  }, []);
  return (
    <Screen>
      <Header eyebrow="CONTROL ROOM" title="Settings & privacy" />
      <View style={styles.group}>
        <SettingRow
          icon="notifications"
          title="Push notifications"
          subtitle="Matches, messages, and sessions"
          value={settings.notifications}
          onValueChange={(v) => updateSettings({ notifications: v })}
        />
        <SettingRow
          icon="eye"
          title="Visible in discovery"
          subtitle="Pause without deleting your profile"
          value={settings.discoveryVisible}
          onValueChange={(v) => updateSettings({ discoveryVisible: v })}
        />
        <SettingRow
          icon="sunny"
          title="Show available now"
          value={settings.showAvailableNow}
          onValueChange={(v) => updateSettings({ showAvailableNow: v })}
        />
        <SettingRow
          icon="eye-off"
          title="Incognito discovery"
          subtitle={
            tier === 'amplified' ? 'Browse without appearing to new people' : 'Amplified feature'
          }
          value={tier === 'amplified' ? settings.incognito : undefined}
          onPress={
            tier === 'free'
              ? () => router.push({ pathname: '/premium', params: { source: 'incognito' } })
              : undefined
          }
          onValueChange={tier === 'amplified' ? (v) => updateSettings({ incognito: v }) : undefined}
        />
      </View>
      <View style={styles.group}>
        <SettingRow
          icon="ban"
          title="Blocked members"
          subtitle="Review and unblock people"
          onPress={() => router.push('/blocked')}
        />
        <SettingRow
          icon="shield-checkmark"
          title="Privacy"
          subtitle="General location only; email stays private"
          onPress={() =>
            Alert.alert(
              'Your privacy',
              'Only your general location and profile details are shown. Email and precise location are never public.',
            )
          }
        />
        <SettingRow
          icon="document-text"
          title="Privacy & community standards"
          onPress={() => router.push('/legal')}
        />
      </View>
      <Button
        label="Sign out"
        variant="secondary"
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
      <Button
        label="Delete account"
        variant="ghost"
        onPress={() =>
          Alert.alert(
            'Delete your account?',
            'This permanently removes your profile, media, matches, and messages. This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await deleteAccount();
                  router.replace('/');
                },
              },
            ],
          )
        }
      />
      <Text style={styles.version}>DELOS 1.0.0</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  group: { backgroundColor: colors.panel, borderRadius: radius.lg, paddingHorizontal: space.md },
  version: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
