import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Field, Header, Screen } from '@/components/ui';
import { repository } from '@/data/repository';
import { colors } from '@/theme';
export default function Apply() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [intro, setIntro] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (intro.trim().length < 10)
      return setError('Write a short introduction about your fit and availability.');
    if (!repository) return setError('Data service unavailable.');
    setBusy(true);
    try {
      await repository.applyToBandCall(id, intro.trim());
      router.replace('/opportunities');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your response.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Header eyebrow="BAND CALL" title="Raise your hand" />
      <Text style={{ color: colors.muted }}>
        Share why the sound fits, what you play, and when you can rehearse. The project owner can
        invite you directly into a conversation.
      </Text>
      <Field
        label="Your introduction"
        multiline
        value={intro}
        onChangeText={setIntro}
        placeholder="I play… I’m available… This project caught me because…"
      />
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button
        label={busy ? 'Sending…' : 'Send interest'}
        disabled={busy}
        icon="paper-plane"
        onPress={submit}
      />
    </Screen>
  );
}
