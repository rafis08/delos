import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const SUPPORT_EMAIL = 'support@delosmusic.app';

export function getSupportDiagnostics(): Record<string, string> {
  return {
    appVersion: Constants.expoConfig?.version || '1.0.0',
    build: String(Constants.nativeBuildVersion || 'development'),
    platform: Platform.OS,
    osVersion: String(Device.osVersion || Platform.Version),
    device: Device.modelName || (Platform.OS === 'web' ? 'Web browser' : 'Unknown device'),
  };
}

export function formatDiagnostics(diagnostics: Record<string, string>) {
  return Object.entries(diagnostics).map(([key, value]) => `${key}: ${value}`).join('\n');
}
