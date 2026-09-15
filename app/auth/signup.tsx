import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Field, Header, Screen } from '@/components/ui';
import { BrandLockup } from '@/components/BrandMark';
import { authSchema } from '@/domain/validation';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';
export default function SignUp() {
  const { signUp } = useApp();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    const v = authSchema.safeParse({ email, password });
    if (!v.success) {
      setError(v.error.issues[0]?.message || 'Check your details');
      return;
    }
    try {
      setLoading(true);
      const result = await signUp(email, password);
      if (result === 'verify')
        router.replace({ pathname: '/auth/reset', params: { verify: email } });
      else router.replace('/onboarding');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen>
      <BrandLockup compact slogan />
      <Header eyebrow="JOIN DELOS" title="Create account" />
      <Text style={{ color: colors.muted }}>
        Your email is used for sign-in and verification only. It is never shown publicly.
      </Text>
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
      <Button
        label={loading ? 'Creating account…' : 'Create account'}
        disabled={loading}
        onPress={submit}
      />
      <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>
        You must be 18 or older. Your general profile is visible to other Delos members.
      </Text>
    </Screen>
  );
}
