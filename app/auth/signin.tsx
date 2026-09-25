import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Field, Header, Screen } from '@/components/ui';
import { BrandLockup } from '@/components/BrandMark';
import { signInSchema } from '@/domain/validation';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';
import { friendlyAuthError } from '@/domain/authMessages';
export default function SignIn() {
  const { signIn } = useApp();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    const valid = signInSchema.safeParse({ email, password });
    if (!valid.success) {
      setError(valid.error.issues[0]?.message || 'Check your details');
      return;
    }
    try {
      setLoading(true);
      await signIn(email, password);
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
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button label={loading ? 'Signing in…' : 'Sign in'} disabled={loading} onPress={submit} />
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
  createRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  secondary: { color: colors.muted },
  link: { color: '#8A5100', fontWeight: '900' },
});
