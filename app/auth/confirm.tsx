import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { BrandLockup } from '@/components/BrandMark';
import { Button, Header, Screen } from '@/components/ui';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';

export default function ConfirmEmail() {
  const { ready, authenticated, onboarded } = useApp();
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    const timer = setTimeout(
      () => router.replace(onboarded ? '/(tabs)/discover' : '/onboarding'),
      600,
    );
    return () => clearTimeout(timer);
  }, [ready, authenticated, onboarded]);

  useEffect(() => {
    if (authenticated) return;
    const timer = setTimeout(() => setTakingLonger(true), 5000);
    return () => clearTimeout(timer);
  }, [authenticated]);

  return (
    <Screen style={styles.screen}>
      <BrandLockup compact slogan />
      <ActivityIndicator size="large" color={colors.accent} />
      <Header
        eyebrow={authenticated ? 'EMAIL CONFIRMED' : 'SECURE SIGN-IN'}
        title={authenticated ? 'You’re in' : 'Confirming your account…'}
      />
      <Text style={styles.body}>
        {authenticated
          ? 'Next, build your musician profile so Delos can find compatible people.'
          : 'Keep this screen open while Delos verifies your confirmation link.'}
      </Text>
      {!authenticated && ready && takingLonger && (
        <>
          <Text style={styles.help}>
            This link may be expired or already used. Try signing in, or request another
            confirmation email.
          </Text>
          <Button
            label="Return to sign in"
            variant="secondary"
            onPress={() => router.replace('/auth/signin')}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', maxWidth: 560 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  help: { color: colors.danger, fontSize: 13, lineHeight: 19 },
});
