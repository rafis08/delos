import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { BrandLockup } from '@/components/BrandMark';
import { Button, Field, Header, Screen } from '@/components/ui';
import { supabase } from '@/data/repository';
import { signUpSchema } from '@/domain/validation';
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
          const validation = signUpSchema.shape.password.safeParse(password);
          if (!validation.success)
            return setError(validation.error.issues[0]?.message || 'Choose a stronger password.');
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
