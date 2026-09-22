import { Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Header, Screen, SettingRow } from '@/components/ui';
import { repository } from '@/data/repository';
import { useApp } from '@/store/AppContext';
import { colors, radius, space } from '@/theme';

export default function PrivacyControls() {
  const { settings, updateSettings } = useApp();
  return (
    <Screen>
      <Header eyebrow="PRIVACY" title="Control what members see" />
      <Text style={styles.note}>Your sign-in email, precise coordinates, support requests, reports, and payment identifiers are never shown on your musician profile.</Text>
      <View style={styles.group}>
        <SettingRow icon="eye" title="Visible in discovery" subtitle="Turn off to stop appearing to new musicians" value={settings.discoveryVisible} onValueChange={(value) => updateSettings({ discoveryVisible: value })} />
        <SettingRow icon="sunny" title="Show available now" subtitle="Share that you are open to timely invitations" value={settings.showAvailableNow} onValueChange={(value) => updateSettings({ showAvailableNow: value })} />
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Approximate location</Text>
        <Text style={styles.note}>Delos stores rounded coordinates privately to calculate distance. Members see only the city or area you entered—never your coordinates or street address.</Text>
        <Button label="Remove saved coordinates" variant="secondary" onPress={() => Alert.alert('Remove approximate coordinates?', 'Distance-based recommendations may be less accurate. Your city or area stays on your profile until you edit it.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: async () => { await repository?.clearApproximateLocation(); Alert.alert('Location removed', 'Your saved coordinates have been cleared.'); } },
        ])} />
      </View>
      <Button label="Manage blocked members" variant="secondary" onPress={() => router.push('/blocked')} />
      <Button label="Privacy policy & standards" variant="ghost" onPress={() => router.push('/legal')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.panel, borderRadius: radius.lg, paddingHorizontal: space.md },
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: space.md, gap: 12 },
  title: { color: colors.text, fontSize: 19, fontWeight: '900' },
  note: { color: colors.muted, lineHeight: 21 },
});
