import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Chips, Field, Header, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { supportTicketSchema } from '@/domain/validation';
import { getSupportDiagnostics, SUPPORT_EMAIL } from '@/services/support';
import { colors, radius, space } from '@/theme';
import { SupportTicket, SupportTicketCategory } from '@/types';

const categories: SupportTicketCategory[] = ['Account', 'Safety', 'Billing', 'Technical', 'Feedback'];

export default function Support() {
  const [category, setCategory] = useState<SupportTicketCategory>('Technical');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void repository?.listSupportTickets().then(setTickets).catch(() => setTickets([]));
  }, []);

  const submit = async () => {
    setError('');
    const validation = supportTicketSchema.safeParse({ category, subject, description, includeDiagnostics });
    if (!validation.success) return setError(validation.error.issues[0]?.message || 'Check the request.');
    if (!repository) return setError('Support is unavailable until Delos is connected.');
    setSending(true);
    try {
      const ticket = await repository.createSupportTicket({
        category, subject: subject.trim(), description: description.trim(),
        diagnostics: includeDiagnostics ? getSupportDiagnostics() : undefined,
      });
      setSubject(''); setDescription(''); setTickets((current) => [ticket, ...(current || [])]);
      Alert.alert('Request received', `Your reference is ${ticket.reference}. We’ll follow up through your verified account email.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your request.');
    } finally { setSending(false); }
  };

  return (
    <Screen>
      <Header eyebrow="DELOS SUPPORT" title="How can we help?" />
      <View style={styles.quickRow}>
        <View style={styles.flex}><Button label="Read the FAQ" variant="secondary" onPress={() => router.push('/faq')} /></View>
        <View style={styles.flex}><Button label="Email support" variant="secondary" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} /></View>
      </View>
      <Text style={styles.note}>For immediate danger, contact local emergency services. Safety reports should also be submitted from the member’s profile.</Text>
      <Text style={styles.label}>What is this about?</Text>
      <Chips items={categories} selected={[category]} onToggle={(value) => setCategory(value as SupportTicketCategory)} />
      <Field label="Subject" value={subject} maxLength={120} onChangeText={setSubject} />
      <Field label="What happened?" multiline value={description} maxLength={3000} onChangeText={setDescription} error={error} />
      <Button
        label={includeDiagnostics ? 'Device details included' : 'Include device details'}
        icon={includeDiagnostics ? 'checkmark-circle' : 'phone-portrait-outline'}
        variant="secondary"
        onPress={() => setIncludeDiagnostics((value) => !value)}
      />
      <Text style={styles.consent}>This adds only app version, build, device model, platform, and OS version. It never adds messages, precise location, passwords, photos, or payment details.</Text>
      <Button label={sending ? 'Sending…' : 'Send support request'} disabled={sending} onPress={submit} />
      <Text style={styles.sectionTitle}>Your requests</Text>
      {tickets === null ? <StateView loading title="Loading requests" body="Checking your support history…" /> : tickets.length === 0 ? (
        <StateView icon="checkmark-circle" title="No open requests" body="New requests and their status will appear here." />
      ) : tickets.map((ticket) => (
        <View key={ticket.id} style={styles.ticket}>
          <View style={styles.ticketTop}><Text style={styles.ticketTitle}>{ticket.subject}</Text><Text style={styles.status}>{ticket.status.replaceAll('_', ' ')}</Text></View>
          <Text style={styles.meta}>{ticket.reference} · {ticket.category} · {new Date(ticket.createdAt).toLocaleDateString()}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', gap: 10 }, flex: { flex: 1 },
  note: { color: colors.muted, lineHeight: 20 }, label: { color: colors.text, fontWeight: '900' },
  consent: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 20, marginTop: space.md },
  ticket: { backgroundColor: colors.panel, borderRadius: radius.md, padding: space.md, gap: 6 },
  ticketTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  ticketTitle: { color: colors.text, fontWeight: '900', flex: 1 },
  status: { color: colors.accentInk, backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  meta: { color: colors.muted, fontSize: 12 },
});
