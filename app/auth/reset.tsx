import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, Field, Header, Screen } from '@/components/ui';
import { BrandLockup } from '@/components/BrandMark';
import { colors } from '@/theme';
import { useApp } from '@/store/AppContext';
import { signInSchema } from '@/domain/validation';
import { friendlyAuthError } from '@/domain/authMessages';

export default function Reset() {
  const { resetPassword } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const result = signInSchema.shape.email.safeParse(email.trim());
    if (!result.success) return setError('Enter a valid email address.');
    try {
      setLoading(true);
      setError('');
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (cause) {
      setError(friendlyAuthError(cause, 'Could not send the reset email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <BrandLockup compact />
      <Header eyebrow="ACCOUNT RECOVERY" title={sent ? 'Check your inbox' : 'Reset password'} />
      {sent ? (
        <>
          <Text style={styles.body}>
            If an account exists for {email.trim()}, Delos sent a secure password-reset link. The
            link will return you to the app.
          </Text>
          <Button label="Back to sign in" onPress={() => router.replace('/auth/signin')} />
          <Button label="Use another email" variant="ghost" onPress={() => setSent(false)} />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Enter the email connected to your Delos account. We’ll send a secure link to choose a
            new password.
          </Text>
          <Field
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => void submit()}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button
            label={loading ? 'Sending link…' : 'Send reset link'}
            disabled={loading}
            onPress={submit}
          />
          <Button label="Back to sign in" variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', maxWidth: 560 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  error: { color: colors.danger, fontWeight: '700' },
});
