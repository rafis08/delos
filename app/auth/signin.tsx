import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Field, Header, Screen } from '@/components/ui';
import { BrandLockup } from '@/components/BrandMark';
import { signInSchema } from '@/domain/validation';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';
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
      setError(cause instanceof Error ? cause.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen>
      <BrandLockup compact slogan />
      <Header eyebrow="WELCOME BACK" title="Sign in" />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={error}
      />
      <Button label={loading ? 'Signing in…' : 'Sign in'} disabled={loading} onPress={submit} />
      <Button label="Forgot password?" variant="ghost" onPress={() => router.push('/auth/reset')} />
      <Text style={{ color: colors.muted, textAlign: 'center' }}>
        No account?{' '}
        <Text style={{ color: colors.accent }} onPress={() => router.push('/auth/signup')}>
          Create one
        </Text>
      </Text>
    </Screen>
  );
}
