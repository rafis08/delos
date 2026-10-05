import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Header, Screen, StateView } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors, radius, space, type } from '@/theme';
import type { ReferralDashboard } from '@/types';

const INVITE_ORIGIN = 'https://delosmusic.app/invite';

export default function InviteFriends() {
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;
    void repository?.trackEvent('referral_screen_viewed').catch(() => undefined);
    void repository
      ?.getReferralDashboard()
      .then((value) => active && setDashboard(value))
      .catch(
        (cause) =>
          active &&
          setError(cause instanceof Error ? cause.message : 'Invite progress is unavailable.'),
      );
    return () => {
      active = false;
    };
  }, []);

  const link = useMemo(() => (dashboard ? `${INVITE_ORIGIN}/${dashboard.code}` : ''), [dashboard]);
  const shareInvite = async () => {
    if (!dashboard || sharing) return;
    try {
      setSharing(true);
      const result = await Share.share({
        title: 'Join me on Delos',
        message: `Find musicians who match your sound, schedule, location, and commitment. Join me on Delos: ${link}`,
        url: link,
      });
      if (result.action === Share.sharedAction) {
        await repository?.trackEvent('referral_link_shared', {
          channel: result.activityType || 'share_sheet',
        });
      }
    } catch (cause) {
      Alert.alert(
        'Could not open sharing',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setSharing(false);
    }
  };

  if (error)
    return (
      <Screen scroll={false}>
        <StateView icon="warning" title="Invites unavailable" body={error} />
      </Screen>
    );
  if (!dashboard)
    return (
      <Screen scroll={false}>
        <StateView
          loading
          title="Preparing your invite"
          body="Loading your unique link and progress…"
        />
      </Screen>
    );

  const justEarned = dashboard.progress === 0 && dashboard.rewardsEarned > 0;
  return (
    <Screen>
      <Header eyebrow="GROW DELOS" title="Invite friends. Get Premium." />
      <View style={styles.hero}>
        <View style={styles.sun}>
          <Ionicons name="sunny" size={32} color={colors.accentInk} />
        </View>
        <Text accessibilityRole="header" style={styles.progressText}>
          {dashboard.progress} / 5 friends joined
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 5, now: dashboard.progress }}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${dashboard.progress * 20}%` }]} />
        </View>
        <Text style={styles.body}>
          Invite 5 new musicians to Delos and get 1 month of Premium free.
        </Text>
        <Button
          label={sharing ? 'Opening share sheet…' : 'Share Invite'}
          icon="share-social"
          disabled={sharing}
          onPress={() => void shareInvite()}
        />
        <Text selectable style={styles.link}>
          {link}
        </Text>
      </View>

      {justEarned && (
        <View style={styles.earned}>
          <Ionicons name="checkmark-circle" size={26} color={colors.orange} />
          <View style={styles.flex}>
            <Text style={styles.earnedTitle}>You earned 1 month of Delos Premium.</Text>
            <Text style={styles.body}>0 / 5 toward your next month</Text>
          </View>
        </View>
      )}

      <View style={styles.stats}>
        <Stat value={dashboard.qualifiedCount} label="Successful" />
        <Stat value={dashboard.pendingCount} label="Pending" />
        <Stat value={dashboard.rewardsEarned} label="Months earned" />
      </View>
      {dashboard.rewardsQueued > 0 && (
        <Text style={styles.queue}>
          {dashboard.rewardsQueued} earned month{dashboard.rewardsQueued === 1 ? '' : 's'} banked
          for after your current Premium access.
        </Text>
      )}
      <View style={styles.howItWorks}>
        <Text style={styles.sectionTitle}>HOW IT WORKS</Text>
        <Step number="1" text="Share your personal invite link." />
        <Step number="2" text="Your friend creates a genuinely new account." />
        <Step number="3" text="They verify their email and complete their musician profile." />
        <Step number="4" text="Every fifth successful referral earns a month of Premium." />
      </View>
      <Text style={styles.finePrint}>
        Referral rewards are reviewed automatically for abuse. Existing accounts, self-referrals,
        repeated accounts, and incomplete profiles do not qualify.
      </Text>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function Step({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#FFF6DC',
    borderColor: '#F2C35E',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
  },
  sun: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  progressText: { color: colors.text, ...type.h1 },
  track: { height: 12, borderRadius: 6, backgroundColor: '#E9DDBB', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: colors.orange },
  body: { color: colors.muted, lineHeight: 21 },
  link: { color: colors.text, textAlign: 'center', fontSize: 12 },
  earned: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: '#FFF0C7',
    alignItems: 'center',
  },
  earnedTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
  },
  statValue: { color: colors.text, ...type.h2, fontSize: 25 },
  statLabel: { color: colors.muted, textAlign: 'center', fontSize: 11 },
  queue: { color: colors.orange, fontWeight: '800', textAlign: 'center' },
  howItWorks: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  sectionTitle: { color: colors.orange, fontWeight: '900', letterSpacing: 1.2, fontSize: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.accentInk, fontWeight: '900' },
  stepText: { color: colors.text, flex: 1, lineHeight: 20 },
  finePrint: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
