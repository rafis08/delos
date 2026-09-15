import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Chips, Field, Header, Screen } from '@/components/ui';
import { repository } from '@/data/repository';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';
import { Commitment } from '@/types';
import { PremiumPrompt } from '@/components/PremiumPrompt';
const toggle = (items: string[], item: string) =>
  items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
export default function CreateBandCall() {
  const { profile } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(profile?.location || '');
  const [roles, setRoles] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>(profile?.genres || []);
  const [commitment, setCommitment] = useState<Commitment>(profile?.commitment || 'Consistent');
  const [frequency, setFrequency] = useState(profile?.rehearsalFrequency || 'Weekly');
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const submit = async () => {
    if (
      title.trim().length < 4 ||
      description.trim().length < 20 ||
      !location.trim() ||
      roles.length === 0
    )
      return setError('Add a clear title, description, location, and at least one needed role.');
    if (!repository) return setError('Data service unavailable.');
    try {
      setLimitReached(false);
      await repository.createBandCall({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        rolesNeeded: roles,
        genres,
        commitment,
        rehearsalFrequency: frequency,
      });
      router.back();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not post band call.';
      if (message.toLowerCase().includes('band call limit')) {
        setLimitReached(true);
        setError(
          'Free members can run one focused search at a time. Close it or add recruiting capacity.',
        );
      } else setError(message);
    }
  };
  return (
    <Screen>
      <Header eyebrow="MAKE THE CALL" title="What are you building?" />
      <Field
        label="Headline"
        value={title}
        onChangeText={setTitle}
        placeholder="Drummer needed for original post-punk trio"
      />
      <Field
        label="The brief"
        multiline
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the sound, current lineup, expectations, and next milestone."
      />
      <Field label="General location" value={location} onChangeText={setLocation} />
      <Text style={{ color: colors.text, fontWeight: '800' }}>Roles needed</Text>
      <Chips
        items={['Vocals', 'Guitar', 'Drums', 'Bass', 'Keys', 'Producer']}
        selected={roles}
        onToggle={(item) => setRoles(toggle(roles, item))}
      />
      <Text style={{ color: colors.text, fontWeight: '800' }}>Genres</Text>
      <Chips
        items={['Alternative Rock', 'Indie', 'Punk', 'R&B', 'Jazz', 'Electronic', 'Metal', 'Folk']}
        selected={genres}
        onToggle={(item) => setGenres(toggle(genres, item))}
      />
      <Text style={{ color: colors.text, fontWeight: '800' }}>Commitment</Text>
      <Chips
        items={['Casual', 'Consistent', 'Serious', 'Professional']}
        selected={[commitment]}
        onToggle={(item) => setCommitment(item as Commitment)}
      />
      <Field label="Rehearsal rhythm" value={frequency} onChangeText={setFrequency} />
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {limitReached && (
        <PremiumPrompt
          source="band-call-limit"
          title="Recruit for multiple roles"
          body="Amplified lets you run up to three active band searches at once."
        />
      )}
      <Button label="Publish band call" icon="megaphone" onPress={submit} />
    </Screen>
  );
}
