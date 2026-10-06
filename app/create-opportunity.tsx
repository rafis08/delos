import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Chips, Field, Header, Screen } from '@/components/ui';
import { repository } from '@/data/repository';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';
import { Commitment } from '@/types';
import { PremiumPrompt } from '@/components/PremiumPrompt';

type FieldErrors = Partial<Record<'title' | 'description' | 'location' | 'roles', string>>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [limitReached, setLimitReached] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    const nextErrors: FieldErrors = {};
    if (title.trim().length < 4) nextErrors.title = 'Write a headline with at least 4 characters.';
    if (description.trim().length < 20)
      nextErrors.description = 'Add at least 20 characters so musicians understand the project.';
    if (!location.trim()) nextErrors.location = 'Add a general location, such as Ann Arbor, MI.';
    if (roles.length === 0) nextErrors.roles = 'Choose at least one role you need.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError('Finish the highlighted field' + (Object.keys(nextErrors).length > 1 ? 's.' : '.'));
      return;
    }
    if (!repository) return setError('Data service unavailable.');
    try {
      setSubmitting(true);
      setLimitReached(false);
      setError('');
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
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Screen>
      <Header eyebrow="MAKE THE CALL" title="What are you building?" />
      <Field
        label="Headline"
        value={title}
        error={fieldErrors.title}
        onChangeText={(value) => {
          setTitle(value);
          if (fieldErrors.title) setFieldErrors((current) => ({ ...current, title: undefined }));
        }}
        placeholder="Drummer needed for original post-punk trio"
      />
      <Field
        label="The brief"
        multiline
        value={description}
        error={fieldErrors.description}
        onChangeText={(value) => {
          setDescription(value);
          if (fieldErrors.description)
            setFieldErrors((current) => ({ ...current, description: undefined }));
        }}
        placeholder="Describe the sound, current lineup, expectations, and next milestone."
      />
      <Field
        label="General location"
        value={location}
        error={fieldErrors.location}
        onChangeText={(value) => {
          setLocation(value);
          if (fieldErrors.location)
            setFieldErrors((current) => ({ ...current, location: undefined }));
        }}
      />
      <Text style={{ color: colors.text, fontWeight: '800' }}>Roles needed</Text>
      <Chips
        items={['Vocals', 'Guitar', 'Drums', 'Bass', 'Keys', 'Producer']}
        selected={roles}
        onToggle={(item) => {
          setRoles(toggle(roles, item));
          if (fieldErrors.roles) setFieldErrors((current) => ({ ...current, roles: undefined }));
        }}
      />
      {!!fieldErrors.roles && <Text style={{ color: colors.danger }}>{fieldErrors.roles}</Text>}
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
      <Button
        label={submitting ? 'Publishing…' : 'Publish band call'}
        icon="megaphone"
        disabled={submitting}
        onPress={submit}
      />
    </Screen>
  );
}
