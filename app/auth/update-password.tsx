import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BrandLockup } from '@/components/BrandMark';
import { Button, Field, Header, Screen } from '@/components/ui';
import { supabase } from '@/data/repository';
import { signUpSchema } from '@/domain/validation';
import { colors } from '@/theme';
import { friendlyAuthError } from '@/domain/authMessages';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Screen style={styles.screen}>
      <BrandLockup compact />
      <Header eyebrow="ACCOUNT RECOVERY" title="Choose a new password" />
      <Text style={styles.body}>
        Use at least 12 characters, including uppercase and lowercase letters and a number.
      </Text>
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
        disabled={saving}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', maxWidth: 560 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  error: { color: colors.danger, fontWeight: '700' },
});
