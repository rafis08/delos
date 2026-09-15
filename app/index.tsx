import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '@/components/ui';
import { BrandLockup, BrandMark } from '@/components/BrandMark';
import { useApp } from '@/store/AppContext';
import { colors, space, type } from '@/theme';

export default function Welcome() {
  const { ready, authenticated, onboarded, configured, enterDemo } = useApp();
  React.useEffect(() => {
    if (ready && authenticated) router.replace(onboarded ? '/(tabs)/discover' : '/onboarding');
  }, [ready, authenticated, onboarded]);
  if (!ready)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  return (
    <Screen style={styles.screen}>
      <LinearGradient colors={['#C55A13', '#5C290A', '#100C07']} style={styles.hero}>
        <View style={styles.sun} />
        <View style={styles.ringTwo} />
        <BrandLockup inverse />
        <BrandMark size={235} style={styles.guardian} />
        <Text style={styles.tagline}>where music is born</Text>
      </LinearGradient>
      <View style={styles.copy}>
        <Text style={styles.title}>Sound is only half the match.</Text>
        <Text style={styles.body}>
          Find musicians who fit your sound, schedule, location, and level of commitment.
        </Text>
      </View>
      {!configured && <Text style={styles.configError}>Supabase configuration is missing.</Text>}
      <View style={{ gap: 10 }}>
        <Button
          label="Create your profile"
          icon="arrow-forward"
          onPress={() => router.push('/auth/signup')}
        />
        <Button
          label="I already have an account"
          variant="secondary"
          onPress={() => router.push('/auth/signin')}
        />
        <Button
          label="Explore the demo"
          variant="ghost"
          onPress={async () => {
            await enterDemo();
            router.replace('/(tabs)/discover');
          }}
        />
      </View>
      <Text style={styles.demoNote}>DEMO MODE USES FICTIONAL DATA ON THIS DEVICE ONLY</Text>
      <Text style={styles.legal}>
        18+ only · By continuing, you agree to our community standards.
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  screen: { justifyContent: 'center', maxWidth: 680 },
  hero: {
    height: 310,
    borderRadius: 28,
    padding: space.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  sun: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,197,61,.48)',
    right: -20,
    top: 28,
  },
  ringTwo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,.25)',
    left: -40,
    bottom: -80,
  },
  guardian: { position: 'absolute', right: -10, bottom: -26, zIndex: 1 },
  tagline: { color: colors.white, ...type.display, maxWidth: 265, zIndex: 2 },
  copy: { gap: 8 },
  title: { color: colors.text, ...type.h2 },
  body: { color: colors.muted, ...type.body },
  legal: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  configError: { color: colors.danger, textAlign: 'center', fontWeight: '700' },
  demoNote: {
    color: colors.accent,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
});
