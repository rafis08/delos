import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Screen, StateView } from '@/components/ui';
import { useApp } from '@/store/AppContext';

export default function AcceptInvite() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { authenticated } = useApp();
  useEffect(() => {
    if (authenticated) {
      router.replace('/invite');
      return;
    }
    const normalized = String(code || '').toUpperCase();
    if (!/^[A-Z0-9]{8,16}$/.test(normalized)) {
      router.replace('/');
      return;
    }
    void AsyncStorage.setItem('delos:referral-code', normalized).then(() =>
      router.replace({ pathname: '/auth/signup', params: { referral: normalized } }),
    );
  }, [authenticated, code]);
  return (
    <Screen scroll={false}>
      <StateView loading title="Opening your invite" body="Getting Delos ready…" />
    </Screen>
  );
}
