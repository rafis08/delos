import { useState } from 'react';
import { Alert, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Header, Screen } from '@/components/ui';
import { repository } from '@/data/repository';
import { useApp } from '@/store/AppContext';
import { colors, radius, space } from '@/theme';

export default function DataRights() {
  const { deleteAccount } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const exportData = async () => {
    if (!repository) return setError('Data export is unavailable.');
    setBusy(true); setError('');
    try {
      const payload = JSON.stringify(await repository.exportAccountData(), null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `delos-data-${new Date().toISOString().slice(0, 10)}.json`;
        link.click(); URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: 'My Delos data', message: payload });
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Export failed.'); }
    finally { setBusy(false); }
  };

  const confirmDelete = () => Alert.alert(
    'Permanently delete Delos account?',
    'Your profile, media, matches, messages, and account access will be removed. Export anything you need first. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete permanently', style: 'destructive', onPress: async () => {
        try { setBusy(true); await deleteAccount(); router.replace('/'); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Deletion failed.'); setBusy(false); }
      } },
    ],
  );

  return (
    <Screen>
      <Header eyebrow="YOUR DATA" title="Data & account" />
      <View style={styles.card}>
        <Text style={styles.title}>Download a copy</Text>
        <Text style={styles.body}>Export the account, profile, preferences, matches, messages, reports, blocks, notifications, sessions, support requests, and subscription status associated with you. Other members’ private account data is excluded.</Text>
        <Button label={busy ? 'Preparing…' : 'Export my data'} disabled={busy} onPress={exportData} />
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>What Delos keeps</Text>
        <Text style={styles.body}>Operational records are kept while your account is active. Security, fraud, payment, and legal records may be retained only as required after deletion. Reports are restricted to authorized trust-and-safety staff.</Text>
        <Button label="Privacy details" variant="secondary" onPress={() => router.push('/legal')} />
      </View>
      <View style={styles.dangerCard}>
        <Text style={styles.title}>Delete your account</Text>
        <Text style={styles.body}>Deletion is permanent. Active subscriptions must also be cancelled through the platform where you purchased them.</Text>
        <Button label="Delete account permanently" variant="danger" disabled={busy} onPress={confirmDelete} />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: space.md, gap: 12 },
  dangerCard: { backgroundColor: colors.panel, borderRadius: radius.lg, padding: space.md, gap: 12, borderWidth: 1, borderColor: colors.danger },
  title: { color: colors.text, fontSize: 19, fontWeight: '900' },
  body: { color: colors.muted, lineHeight: 21 }, error: { color: colors.danger, fontWeight: '800' },
});
