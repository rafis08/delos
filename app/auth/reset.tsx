import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Field, Header, Screen } from '@/components/ui';
import { BrandLockup } from '@/components/BrandMark';
import { colors } from '@/theme';
import { useApp } from '@/store/AppContext';
export default function Reset() {
  const params = useLocalSearchParams<{ verify?: string }>();
  const { resetPassword } = useApp();
  const [email, setEmail] = useState(params.verify || '');
  const [sent, setSent] = useState(Boolean(params.verify));
  const [error, setError] = useState('');
  return (
    <Screen>
      <BrandLockup compact />
      <Header
        eyebrow={params.verify ? 'VERIFY YOUR EMAIL' : 'ACCOUNT RECOVERY'}
        title={params.verify ? 'Check your inbox' : 'Reset password'}
      />
      {sent ? (
        <>
          <Text style={{ color: colors.text, fontSize: 18 }}>Check your inbox</Text>
          <Text style={{ color: colors.muted }}>
            If an account exists for {email}, we sent reset instructions.
          </Text>
          <Button label="Back to sign in" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            label="Send reset link"
            onPress={async () => {
              try {
                await resetPassword(email);
                setSent(true);
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'Could not send reset email');
              }
            }}
          />
          {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
        </>
      )}
    </Screen>
  );
}
