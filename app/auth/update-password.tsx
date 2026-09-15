import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { BrandLockup } from '@/components/BrandMark';
import { Button, Field, Header, Screen } from '@/components/ui';
import { supabase } from '@/data/repository';
import { colors } from '@/theme';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Screen>
      <BrandLockup compact />
      <Header eyebrow="ACCOUNT RECOVERY" title="Choose a new password" />
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry />
      <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button
        label={saving ? 'Updating…' : 'Update password'}
        disabled={saving}
        onPress={async () => {
          if (password.length < 8) return setError('Use at least 8 characters.');
          if (password !== confirm) return setError('Passwords do not match.');
          if (!supabase) return setError('Supabase is not configured.');
          setSaving(true);
          const { error: updateError } = await supabase.auth.updateUser({ password });
          setSaving(false);
          if (updateError) return setError(updateError.message);
          router.replace('/(tabs)/discover');
        }}
      />
    </Screen>
  );
}
