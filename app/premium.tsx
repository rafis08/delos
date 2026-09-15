import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Button, Header, Screen } from '@/components/ui';
import { repository } from '@/data/repository';
import { billingService } from '@/services/billing';
import { useApp } from '@/store/AppContext';
import { colors, radius, space, type } from '@/theme';
const features = [
  ['heart-circle', 'See who liked you', 'Start with musicians who already want to connect.'],
  ['infinite', 'Unlimited likes', 'Keep moving when the right people are in front of you.'],
  ['megaphone', 'Three active searches', 'Recruit for multiple roles or projects at once.'],
  ['play-back', 'Rewind passes', 'Bring back the last profile when you change your mind.'],
  ['eye-off', 'Incognito control', 'Choose when your profile appears in discovery.'],
  ['rocket', 'Weekly profile boost', 'Get 24 hours of priority when you’re ready to respond.'],
  ['albums', '10 media slots', 'Show more of your playing before the first message.'],
] as const;
const headline: Record<string, string> = {
  'like-limit': 'Keep the momentum.',
  'likes-you': 'Start with yes.',
  rewind: 'Second thoughts happen.',
  'advanced-filters': 'Search with intention.',
  'band-call-limit': 'Keep building your lineup.',
  'discovery-meter': 'Discovery without the ceiling.',
};
export default function Premium() {
  const [tier, setTier] = useState<'free' | 'amplified'>('free');
  const [busy, setBusy] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [offer, setOffer] = useState({ price: '$9.99', period: 'month', configured: true });
  const { checkout, source } = useLocalSearchParams<{ checkout?: string; source?: string }>();
  const { demoMode } = useApp();
  useEffect(() => {
    void repository
      ?.trackEvent('premium_viewed', { source: source || 'direct' })
      .catch(() => undefined);
    void billingService
      .getOffer()
      .then(setOffer)
      .catch(() => undefined);
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = checkout === 'success' ? 5 : 1;
    const refresh = async () => {
      const next = await repository?.getSubscriptionTier().catch(() => undefined);
      if (!active) return;
      if (next) setTier(next);
      attempts -= 1;
      if (checkout === 'success' && next !== 'amplified' && attempts > 0)
        timer = setTimeout(() => void refresh(), 1500);
    };
    void refresh();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [checkout, source]);

  const billingAction = async () => {
    if (demoMode) {
      Alert.alert('Demo mode', 'Purchases are disabled in the fictional product demo.');
      return;
    }
    if (billingService.availability === 'native-store-unconfigured') {
      Alert.alert(
        'App Store setup required',
        'Amplified will be available after the App Store subscription is connected.',
      );
      return;
    }
    try {
      setBusy(true);
      if (tier === 'amplified') await billingService.manageSubscription();
      else {
        void repository
          ?.trackEvent('checkout_started', { source: source || 'direct' })
          .catch(() => undefined);
        await billingService.startSubscription();
      }
    } catch (cause) {
      Alert.alert(
        'Billing unavailable',
        cause instanceof Error ? cause.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header
        eyebrow="DELOS AMPLIFIED"
        title={headline[source || ''] || 'Find your people faster.'}
      />
      {tier === 'amplified' && (
        <Text style={styles.active}>AMPLIFIED IS ACTIVE ON YOUR ACCOUNT</Text>
      )}
      {tier === 'amplified' && (
        <View style={styles.activeTools}>
          <Text style={styles.activeTitle}>Your Amplified controls</Text>
          <Text style={styles.activeBody}>
            Use your weekly 24-hour boost when you’re available to respond and make plans.
          </Text>
          <Button
            label={boosting ? 'Starting boost…' : 'Boost my profile for 24 hours'}
            icon="rocket"
            disabled={boosting}
            onPress={async () => {
              try {
                setBoosting(true);
                await repository?.activateProfileBoost();
                Alert.alert(
                  'Profile boosted',
                  'You’ll be prioritized in eligible discovery decks for 24 hours.',
                );
              } catch (cause) {
                Alert.alert(
                  'Boost unavailable',
                  cause instanceof Error ? cause.message : 'Try again later.',
                );
              } finally {
                setBoosting(false);
              }
            }}
          />
          <Button
            label="See who liked you"
            variant="secondary"
            onPress={() => router.push('/likes-you')}
          />
        </View>
      )}
      {checkout === 'success' && tier !== 'amplified' && (
        <Text style={styles.pending}>Payment received. Activating Amplified…</Text>
      )}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.mark}>
            <Ionicons name="sunny" size={25} color={colors.accentInk} />
          </View>
          <Text style={styles.bestFor}>FOR MUSICIANS READY TO MOVE</Text>
        </View>
        <Text style={styles.heroTitle}>Less browsing. More rehearsing.</Text>
        <Text style={styles.body}>
          Amplified removes friction between finding a promising musician and getting into the same
          room.
        </Text>
      </View>
      <View style={styles.offer}>
        <View>
          <Text style={styles.planLabel}>AMPLIFIED MONTHLY</Text>
          <Text style={styles.priceText}>
            {offer.price} <Text style={styles.month}>/ {offer.period}</Text>
          </Text>
        </View>
        <Text style={styles.trial}>
          Auto-renews monthly until canceled. Cancel anytime in your subscription settings.
        </Text>
        <Button
          label={
            busy
              ? 'Opening secure billing…'
              : tier === 'amplified'
                ? 'Manage subscription'
                : demoMode
                  ? 'Demo preview only'
                  : billingService.availability === 'stripe-web'
                    ? 'Continue to secure checkout'
                    : billingService.availability === 'native-store'
                      ? 'Subscribe with Apple'
                      : 'App Store setup required'
          }
          icon="sunny"
          disabled={busy || (!offer.configured && !demoMode)}
          onPress={() => void billingAction()}
        />
        <View style={styles.trustRow}>
          <Text style={styles.trust}>✓ Secure purchase</Text>
          <Text style={styles.trust}>✓ No long-term contract</Text>
        </View>
        {billingService.availability === 'native-store' && tier !== 'amplified' && !demoMode && (
          <Button
            label="Restore purchases"
            variant="ghost"
            onPress={async () => {
              try {
                setBusy(true);
                const restored = await billingService.restorePurchases();
                Alert.alert(
                  restored ? 'Purchase restored' : 'Nothing to restore',
                  restored
                    ? 'Amplified is active again.'
                    : 'No Amplified purchase was found for this Apple Account.',
                );
                if (restored) setTier('amplified');
              } catch (cause) {
                Alert.alert(
                  'Restore unavailable',
                  cause instanceof Error ? cause.message : 'Please try again.',
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </View>
      <Text style={styles.sectionTitle}>WHAT YOU UNLOCK</Text>
      <View style={styles.features}>
        {features.map(([icon, label, description]) => (
          <View key={label} style={styles.feature}>
            <View style={styles.icon}>
              <Ionicons name={icon} size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureText}>{label}</Text>
              <Text style={styles.featureBody}>{description}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.faq}>
        <Text style={styles.sectionTitle}>GOOD TO KNOW</Text>
        <Text style={styles.faqTitle}>Does Amplified guarantee a match?</Text>
        <Text style={styles.faqBody}>
          No. It gives you better tools and fewer limits; musicians still choose each other.
        </Text>
        <Text style={styles.faqTitle}>Can I cancel?</Text>
        <Text style={styles.faqBody}>
          Yes. Manage or cancel it through the same platform where you subscribed.
        </Text>
      </View>
      <Button label="Privacy & terms" variant="ghost" onPress={() => router.push('/legal')} />
      <Button label="Maybe later" variant="ghost" onPress={() => router.back()} />
      <Text style={styles.disclaimer}>
        {demoMode
          ? 'DEMO MODE · No purchase will be started.'
          : billingService.availability === 'stripe-web'
            ? 'TEST MODE · Stripe test checkout does not make a real charge.'
            : billingService.availability === 'native-store'
              ? 'Payment is charged to your Apple Account after confirmation.'
              : 'Amplified is not available for purchase in this build.'}
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: {
    padding: space.xl,
    backgroundColor: '#FFF6DC',
    borderRadius: radius.lg,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F2C35E',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  bestFor: { color: '#8B5000', fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
  heroTitle: { color: colors.text, ...type.h1 },
  body: { color: colors.muted, ...type.body },
  features: { gap: 6 },
  sectionTitle: { color: colors.muted, fontWeight: '900', fontSize: 11, letterSpacing: 0.9 },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { color: colors.text, fontWeight: '700', fontSize: 16, flex: 1 },
  featureBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  offer: {
    gap: 12,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  planLabel: { color: '#8B5000', fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
  priceText: { color: colors.text, fontSize: 28, fontWeight: '900' },
  month: { fontSize: 15, color: colors.muted, fontWeight: '500' },
  trial: { color: colors.muted },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  trust: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  faq: { gap: 6, padding: space.md, backgroundColor: colors.panel, borderRadius: radius.md },
  faqTitle: { color: colors.text, fontWeight: '800', marginTop: 5 },
  faqBody: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  disclaimer: { color: colors.warning, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  active: {
    color: '#7A4100',
    backgroundColor: '#FFF0C2',
    padding: 10,
    borderRadius: radius.pill,
    textAlign: 'center',
    fontWeight: '900',
  },
  pending: {
    color: '#7A4100',
    backgroundColor: '#FFF6DC',
    padding: 10,
    borderRadius: radius.md,
    textAlign: 'center',
    fontWeight: '800',
  },
  activeTools: {
    gap: 10,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFF9EF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  activeTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  activeBody: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
