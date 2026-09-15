import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/store/AppContext';
import { colors } from '@/theme';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
});

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.ink },
              animation: 'slide_from_right',
            }}
          />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
export default Sentry.wrap(RootLayout);
