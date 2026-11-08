import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Field, Header, Screen } from '@/components/ui';
import { BrandLockup } from '@/components/BrandMark';
import { signInSchema } from '@/domain/validation';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';
import { friendlyAuthError } from '@/domain/authMessages';
import { LEGAL_BASE_URL } from '@/config/legal';
export default function SignIn() {
  const { passwordChanged } = useLocalSearchParams<{ passwordChanged?: string }>();
  const { signIn } = useApp();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    const valid = signInSchema.safeParse({ email, password });
    if (!valid.success) {
      setError(valid.error.issues[0]?.message || 'Check your details');
      return;
    }
    try {
      setLoading(true);
      if (!legalAccepted) {
        setError('Accept the Terms of Use and Community Guidelines before signing in.');
        return;
      }
      await signIn(email, password, legalAccepted);
      router.replace('/');
    } catch (cause) {
      const message = friendlyAuthError(cause, 'Unable to sign in.');
      setError(message);
      if (message.includes('Confirm your email'))
        router.push({ pathname: '/auth/check-email', params: { email: email.trim() } });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen style={styles.screen}>
      <BrandLockup compact slogan />
      <Header eyebrow="WELCOME BACK" title="Sign in" />
      {passwordChanged === 'true' && (
        <Text style={styles.success}>Password updated. Sign in with your new password.</Text>
      )}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />
      <Button
        label={
          legalAccepted
            ? 'Terms & community rules accepted'
            : 'Accept Terms & Community Guidelines'
        }
        icon={legalAccepted ? 'checkmark-circle' : 'ellipse-outline'}
        variant="secondary"
        onPress={() => setLegalAccepted((value) => !value)}
      />
      <View style={styles.legalLinks}>
        <Text
          style={styles.legalLink}
          onPress={() => void Linking.openURL(`${LEGAL_BASE_URL}/terms`)}
        >
          Read Terms
        </Text>
        <Text style={styles.secondary}>·</Text>
        <Text
          style={styles.legalLink}
          onPress={() => void Linking.openURL(`${LEGAL_BASE_URL}/community`)}
        >
          Community Guidelines
        </Text>
      </View>
      <Text style={styles.safetyNotice}>
        Delos has zero tolerance for objectionable content or abusive users. Reports are reviewed
        promptly and confirmed violations may result in content removal and account termination.
      </Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button
        label={loading ? 'Signing in…' : 'Sign in'}
        disabled={loading || !legalAccepted}
        onPress={submit}
      />
      <Button label="Forgot password?" variant="ghost" onPress={() => router.push('/auth/reset')} />
      <View style={styles.createRow}>
        <Text style={styles.secondary}>New to Delos?</Text>
        <Text style={styles.link} onPress={() => router.push('/auth/signup')}>
          Create an account
        </Text>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { justifyContent: 'center', maxWidth: 560 },
  error: { color: colors.danger, fontWeight: '700' },
  success: {
    color: '#675000',
    backgroundColor: '#FFF4C7',
    borderColor: '#E6BD32',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontWeight: '700',
  },
  createRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  secondary: { color: colors.muted },
  link: { color: '#8A5100', fontWeight: '900' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  legalLink: { color: '#8A5100', fontWeight: '800', textDecorationLine: 'underline' },
  safetyNotice: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
