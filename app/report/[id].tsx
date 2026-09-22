import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button, Chips, Field, Header, Screen } from '@/components/ui';
import { repository } from '@/data/repository';
import { useApp } from '@/store/AppContext';
import { reportSchema } from '@/domain/validation';
import { colors } from '@/theme';
export default function Report() {
  const { block } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    const v = reportSchema.safeParse({ reason, details });
    if (!v.success) {
      setError('Choose a reason.');
      return;
    }
    if (!repository) return setError('Supabase is not configured.');
    try {
      await repository.report(id, reason, details);
      Alert.alert('Report received', 'The report is confidential. Would you also like to block this member?', [
        { text: 'Not now', onPress: () => router.replace('/(tabs)/discover') },
        { text: 'Block member', style: 'destructive', onPress: async () => {
          await block(id);
          router.replace('/(tabs)/discover');
        } },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit this report.');
    }
  };
  return (
    <Screen>
      <Header eyebrow="SAFETY" title="Report this member" />
      <Text style={{ color: colors.muted }}>
        Reports are confidential. If you are in immediate danger, contact local emergency services.
      </Text>
      <Chips
        items={[
          'Harassment',
          'Spam or scam',
          'Hate speech',
          'Inappropriate content',
          'Under 18',
          'Other',
        ]}
        selected={[reason]}
        onToggle={setReason}
      />
      <Field
        label="Details (optional)"
        multiline
        value={details}
        onChangeText={setDetails}
        error={error}
      />
      <Button label="Submit report" variant="danger" onPress={submit} />
    </Screen>
  );
}
