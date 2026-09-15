import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function requestPushToken(): Promise<{
  token: string;
  platform: 'ios' | 'android' | 'web';
} | null> {
  if (!Device.isDevice || Platform.OS === 'web') return null;
  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: data, platform: Platform.OS as 'ios' | 'android' };
}
