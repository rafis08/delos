import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, Field, Header, Screen } from '@/components/ui';
import { BrandLockup } from '@/components/BrandMark';
import { signUpSchema } from '@/domain/validation';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';
import { friendlyAuthError } from '@/domain/authMessages';
import { LEGAL_BASE_URL } from '@/config/legal';
export default function SignUp() {
  const { signUp } = useApp();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adultAttested, setAdultAttested] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    const v = signUpSchema.safeParse({ email, password });
    if (!v.success) {
      setError(v.error.issues[0]?.message || 'Check your details');
      return;
    }
    try {
      setLoading(true);
      if (!adultAttested) return setError('Confirm that you are 18 or older.');
      if (!legalAccepted) return setError('Accept the Terms of Use and Privacy Policy.');
      const result = await signUp(email, password, adultAttested, legalAccepted);
      if (result === 'verify')
        router.replace({ pathname: '/auth/check-email', params: { email: email.trim() } });
      else router.replace('/onboarding');
    } catch (cause) {
      setError(friendlyAuthError(cause, 'Unable to create your account.'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen style={styles.screen}>
      <BrandLockup compact slogan />
      <Header eyebrow="JOIN DELOS" title="Create account" />
      <Text style={styles.intro}>
        Your email is used for sign-in and verification only. It is never shown publicly.
      </Text>
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
      <Button
        label={adultAttested ? 'Age 18+ confirmed' : 'I confirm I am 18 or older'}
        icon={adultAttested ? 'checkmark-circle' : 'ellipse-outline'}
        variant="secondary"
        onPress={() => setAdultAttested((value) => !value)}
      />
      <Button
        label={legalAccepted ? 'Terms & privacy accepted' : 'Accept Terms & Privacy Policy'}
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
          onPress={() => void Linking.openURL(`${LEGAL_BASE_URL}/privacy`)}
        >
          Read Privacy Policy
        </Text>
      </View>
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />
      <Text style={styles.passwordHint}>12+ characters · uppercase · lowercase · number</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button
        label={loading ? 'Creating account…' : 'Create account'}
        disabled={loading || !adultAttested || !legalAccepted}
        onPress={submit}
      />
      <Text style={styles.disclosure}>
        You must be 18 or older. Your general profile is visible to other Delos members.
      </Text>
      <View style={styles.signInRow}>
        <Text style={styles.secondary}>Already have an account?</Text>
        <Text style={styles.link} onPress={() => router.replace('/auth/signin')}>
          Sign in
        </Text>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { justifyContent: 'center', maxWidth: 560 },
  intro: { color: colors.muted, lineHeight: 21 },
  error: { color: colors.danger, fontWeight: '700' },
  passwordHint: { color: colors.muted, fontSize: 12, marginTop: -12 },
  disclosure: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  signInRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  secondary: { color: colors.muted },
  link: { color: '#8A5100', fontWeight: '900' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  legalLink: { color: '#8A5100', fontWeight: '800', textDecorationLine: 'underline' },
});
