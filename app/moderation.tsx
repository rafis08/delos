import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
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
type SupportQueueItem = {
  id: string;
  reference: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  escalated_to_development_at?: string;
};
type ReferralQueueItem = {
  referral_id: string;
  referrer_name: string;
  referred_name: string;
  status: string;
  created_at: string;
  qualified_at?: string;
  reward_id?: string;
  risk_flags: string[];
  rewards_earned: number;
  rewards_redeemed: number;
};
export default function Moderation() {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [tickets, setTickets] = useState<SupportQueueItem[]>([]);
  const [referrals, setReferrals] = useState<ReferralQueueItem[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([
      supabase?.rpc('moderation_queue'),
      supabase?.rpc('support_queue'),
      supabase?.rpc('referral_admin_dashboard'),
    ]).then(([reports, support, referralResult]) => {
      if (reports?.error) setError(reports.error.message);
      else setItems((reports?.data || []) as QueueItem[]);
      if (!support?.error) setTickets((support?.data || []) as SupportQueueItem[]);
      if (!referralResult?.error) setReferrals((referralResult?.data || []) as ReferralQueueItem[]);
    });
  }, []);
  const moderate = async (item: QueueItem, action: 'suspend' | 'ban' | 'dismiss') => {
    const { error: actionError } = await supabase!.rpc('moderate_member', {
      target_user_id: item.reported_id,
      moderation_action: action,
      action_notes: `${action} from beta report queue`,
      related_report_id: item.id,
    });
    if (actionError) return setError(actionError.message);
    setItems((current) => current?.filter((candidate) => candidate.id !== item.id) || []);
  };
  const updateReferral = async (item: ReferralQueueItem, action: 'grant' | 'revoke' | 'reject') => {
    const { error: referralError } = await supabase!.rpc('admin_update_referral', {
      target_referral_id: item.referral_id,
      requested_action: action,
      reason: `Manual ${action} from Delos referral admin`,
    });
    if (referralError) return setError(referralError.message);
    const { data } = await supabase!.rpc('referral_admin_dashboard');
    setReferrals((data || []) as ReferralQueueItem[]);
  };
  const updateTicket = async (ticket: SupportQueueItem, status: string, escalate = false) => {
    const { error: ticketError } = await supabase!.rpc('update_support_ticket', {
      ticket_id: ticket.id,
      next_status: status,
      resolution: null,
      escalate,
    });
    if (ticketError) return setError(ticketError.message);
    setTickets((current) =>
      current.map((item) =>
        item.id === ticket.id
          ? {
              ...item,
              status,
              escalated_to_development_at: escalate
                ? new Date().toISOString()
                : item.escalated_to_development_at,
            }
          : item,
      ),
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
        Restricted to moderator and admin accounts. Every member action is written to the audit log.
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
                  onPress={() => moderate(item, 'dismiss')}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label="Suspend 7 days"
                  variant="danger"
                  onPress={() =>
                    Alert.alert(
                      'Suspend this member?',
                      'Their profile will be removed from discovery for seven days.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Suspend',
                          style: 'destructive',
                          onPress: () => moderate(item, 'suspend'),
                        },
                      ],
                    )
                  }
                />
              </View>
            </View>
            <Button
              label="Ban account"
              variant="ghost"
              onPress={() =>
                Alert.alert(
                  'Ban this member?',
                  'Their profile will be removed from discovery until an admin restores it.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Ban', style: 'destructive', onPress: () => moderate(item, 'ban') },
                  ],
                )
              }
            />
          </View>
        ))
      )}
      <Text style={styles.heading}>Support queue</Text>
      {tickets.length === 0 ? (
        <Text style={styles.note}>No support requests in the queue.</Text>
      ) : (
        tickets.map((ticket) => (
          <View key={ticket.id} style={styles.card}>
            <Text style={styles.reason}>{ticket.subject}</Text>
            <Text style={styles.meta}>
              {ticket.reference} · {ticket.category} · {ticket.priority} · {ticket.status}
            </Text>
            <Text style={styles.detail}>{ticket.description}</Text>
            {ticket.escalated_to_development_at && (
              <Text style={styles.escalated}>Escalated to Development</Text>
            )}
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button
                  label="Take"
                  variant="secondary"
                  onPress={() => updateTicket(ticket, 'in_progress')}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label="Escalate"
                  variant="secondary"
                  onPress={() => updateTicket(ticket, 'in_progress', true)}
                />
              </View>
            </View>
            <Button
              label="Resolve"
              variant="ghost"
              onPress={() => updateTicket(ticket, 'resolved')}
            />
          </View>
        ))
      )}
      <Text style={styles.heading}>Referral program</Text>
      {referrals.length === 0 ? (
        <Text style={styles.note}>No referral activity yet.</Text>
      ) : (
        referrals.map((item) => (
          <View key={item.referral_id} style={styles.card}>
            <Text style={styles.reason}>
              {item.referrer_name} → {item.referred_name}
            </Text>
            <Text style={styles.meta}>
              {item.status} · {new Date(item.created_at).toLocaleString()}
            </Text>
            <Text style={styles.detail}>
              Rewards: {item.rewards_earned} earned · {item.rewards_redeemed} redeemed
            </Text>
            {item.risk_flags.length > 0 && (
              <Text style={styles.error}>Flags: {item.risk_flags.join(', ')}</Text>
            )}
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button
                  label="Grant"
                  variant="secondary"
                  onPress={() => updateReferral(item, 'grant')}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label="Reject"
                  variant="secondary"
                  onPress={() => updateReferral(item, 'reject')}
                />
              </View>
            </View>
            {!!item.reward_id && (
              <Button
                label="Revoke reward"
                variant="danger"
                onPress={() =>
                  Alert.alert(
                    'Revoke this reward?',
                    'This removes an unredeemed referral month and records an audit action.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Revoke',
                        style: 'destructive',
                        onPress: () => updateReferral(item, 'revoke'),
                      },
                    ],
                  )
                }
              />
            )}
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
  heading: { color: colors.text, fontWeight: '900', fontSize: 23, marginTop: space.lg },
  escalated: { color: colors.orange, fontWeight: '900' },
});
