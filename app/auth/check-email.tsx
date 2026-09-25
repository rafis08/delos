import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BrandLockup } from '@/components/BrandMark';
import { Button, Header, Screen } from '@/components/ui';
import { friendlyAuthError } from '@/domain/authMessages';
import { useApp } from '@/store/AppContext';
import { colors } from '@/theme';

export default function CheckEmail() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { resendVerification } = useApp();
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  const resend = async () => {
    try {
      setSending(true);
      setNotice('');
      await resendVerification(email);
      setNotice('A new confirmation email is on its way.');
    } catch (cause) {
      setNotice(friendlyAuthError(cause, 'Could not resend the confirmation email.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <BrandLockup compact slogan />
      <Header eyebrow="ONE LAST STEP" title="Confirm your email" />
      <Text style={styles.body}>
        We sent a confirmation link to <Text style={styles.email}>{email}</Text>. Open it on this
        phone and Delos will bring you back to finish your musician profile.
      </Text>
      <Text style={styles.tip}>No email? Check spam, then request a new link.</Text>
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      <Button label="I confirmed — continue" onPress={() => router.replace('/auth/signin')} />
      <Button
        label={sending ? 'Sending…' : 'Resend confirmation email'}
        variant="secondary"
        disabled={sending || !email}
        onPress={resend}
      />
      <Button label="Use a different account" variant="ghost" onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', maxWidth: 560 },
  body: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  email: { color: colors.text, fontWeight: '900' },
  tip: { color: colors.muted, fontSize: 13 },
  notice: { color: '#805000', fontWeight: '800' },
});
