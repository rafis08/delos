import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as Linking from 'expo-linking';
import { BrandLockup } from '@/components/BrandMark';
import { Button, Field, Header, Screen } from '@/components/ui';
import { supabase } from '@/data/repository';
import { signUpSchema } from '@/domain/validation';
import { colors } from '@/theme';
import { friendlyAuthError } from '@/domain/authMessages';
import { authLinkRoute, establishSessionFromAuthLink } from '@/domain/authLinks';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      if (!supabase) {
        if (active) setError('Delos account services are not configured in this build.');
        return;
      }
      try {
        const url = await Linking.getInitialURL();
        if (url && authLinkRoute(url) === 'auth/update-password') {
          await establishSessionFromAuthLink(supabase, url);
        }
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error('This password-reset link is invalid or has expired.');
        if (active) setSessionReady(true);
      } catch (cause) {
        if (active)
          setError(
            friendlyAuthError(
              cause,
              'This password-reset link is invalid or has expired. Request a new link and try again.',
            ),
          );
      }
    };
    void prepare();
    return () => {
      active = false;
    };
  }, []);
  return (
    <Screen style={styles.screen}>
      <BrandLockup compact />
      <Header eyebrow="ACCOUNT RECOVERY" title="Choose a new password" />
      <Text style={styles.body}>
        {sessionReady
          ? 'Use at least 12 characters, including uppercase and lowercase letters and a number.'
          : 'Securely opening your password-reset link…'}
      </Text>
      {!sessionReady && !error && <ActivityIndicator color={colors.accent} />}
      <Field
        label="New password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError('');
        }}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Field
        label="Confirm password"
        value={confirm}
        onChangeText={(value) => {
          setConfirm(value);
          setError('');
        }}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button
        label={saving ? 'Updating…' : 'Update password'}
        disabled={saving || !sessionReady}
        onPress={async () => {
          const validation = signUpSchema.shape.password.safeParse(password);
          if (!validation.success)
            return setError(validation.error.issues[0]?.message || 'Choose a stronger password.');
          if (password !== confirm) return setError('Passwords do not match.');
          if (!supabase) return setError('Supabase is not configured.');
          setSaving(true);
          const { error: updateError } = await supabase.auth.updateUser({ password });
          setSaving(false);
          if (updateError)
            return setError(friendlyAuthError(updateError, 'Could not update your password.'));
          router.replace('/');
        }}
      />
      {!sessionReady && !!error && (
        <Button
          label="Request a new link"
          variant="secondary"
          onPress={() => router.replace('/auth/reset')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', maxWidth: 560 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  error: { color: colors.danger, fontWeight: '700' },
});
