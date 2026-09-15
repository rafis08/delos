import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button, Chips, Field, Header, Screen } from '@/components/ui';
import { repository } from '@/data/repository';
import { reportSchema } from '@/domain/validation';
import { colors } from '@/theme';
export default function Report() {
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
    await repository.report(id, reason, details);
    Alert.alert('Report received', 'Thanks for helping keep Delos safe. Our team will review it.', [
      { text: 'Done', onPress: () => router.replace('/(tabs)/discover') },
    ]);
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
