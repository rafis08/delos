import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { demoUser } from '@/data/demoData';
import {
  enableDemoRepository,
  enableSupabaseRepository,
  repository,
  supabase,
} from '@/data/repository';
import { MusicianProfile, NotificationItem, UserSettings } from '@/types';
import { requestPushToken } from '@/services/push';
import { demoModeEnabled } from '@/config/runtime';

type AppState = {
  ready: boolean;
  authenticated: boolean;
  configured: boolean;
  onboarded: boolean;
  offline: boolean;
  userId: string | null;
  profile: MusicianProfile | null;
  notifications: NotificationItem[];
  settings: UserSettings;
  demoMode: boolean;
  enterDemo(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, adultAttested: boolean): Promise<'confirmed' | 'verify'>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  finishOnboarding(profile: MusicianProfile): Promise<void>;
  updateProfile(profile: MusicianProfile): Promise<void>;
  uploadMedia(uri: string, mimeType: string, title: string): Promise<void>;
  like(id: string): Promise<boolean>;
  pass(id: string): Promise<void>;
  block(id: string): Promise<void>;
  deleteAccount(): Promise<void>;
  markNotificationsRead(): Promise<void>;
  updateSettings(next: Partial<UserSettings>): void;
};

const Context = createContext<AppState | null>(null);
const defaultSettings: UserSettings = {
  notifications: true,
  discoveryVisible: true,
  showAvailableNow: true,
  incognito: false,
};
const needRepo = () => {
  if (!repository) throw new Error('The data service is not available.');
  return repository;
};

export function AppProvider({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<MusicianProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const handleAuthLink = async (url: string | null) => {
      if (!url || !supabase) return;
      const parsed = Linking.parse(url);
      const path = parsed.path?.replace(/^\//, '');
      const expected = Linking.parse(Linking.createURL('/'));
      const trustedOrigin =
        parsed.scheme === 'delos' ||
        (['http', 'https'].includes(parsed.scheme || '') &&
          parsed.scheme === expected.scheme &&
          parsed.hostname === expected.hostname);
      if (!trustedOrigin || !['auth/signin', 'auth/update-password'].includes(path || '')) return;
      const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
      if (code) await supabase.auth.exchangeCodeForSession(code);
    };
    void Linking.getInitialURL().then(handleAuthLink);
    const subscription = Linking.addEventListener('url', ({ url }) => void handleAuthLink(url));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    const load = async (id: string | null) => {
      if (!active) return;
      setUserId(id);
      if (id && repository) {
        try {
          const [nextProfile, nextNotifications] = await Promise.all([
            repository.getProfile(id),
            repository.listNotifications(),
          ]);
          setProfile(nextProfile);
          setNotifications(nextNotifications);
        } catch {
          setProfile(null);
          setNotifications([]);
        }
      } else {
        setProfile(null);
        setNotifications([]);
      }
      setReady(true);
    };
    let unsubscribe: (() => void) | undefined;
    void AsyncStorage.getItem('delos:settings')
      .then((value) => value && setSettings(JSON.parse(value)))
      .catch(() => undefined);
    void AsyncStorage.getItem('delos:demo').then(async (flag) => {
      if (flag === 'true' && demoModeEnabled) {
        enableDemoRepository();
        setDemoMode(true);
        setUserId('me');
        setProfile(demoUser);
        setNotifications(await needRepo().listNotifications());
        setReady(true);
        return;
      }
      if (flag === 'true') await AsyncStorage.removeItem('delos:demo');
      enableSupabaseRepository();
      if (!supabase) {
        setReady(true);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      await load(sessionData.session?.user.id || null);
      const { data } = supabase.auth.onAuthStateChange(
        (_event, session) => void load(session?.user.id || null),
      );
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      authenticated: Boolean(userId),
      configured: Boolean(supabase),
      onboarded: Boolean(profile),
      offline: false,
      userId,
      profile,
      notifications,
      settings,
      demoMode,
      enterDemo: async () => {
        if (!demoModeEnabled) throw new Error('Demo mode is not available in this build.');
        enableDemoRepository();
        await AsyncStorage.setItem('delos:demo', 'true');
        setDemoMode(true);
        setUserId('me');
        setProfile(demoUser);
        setNotifications(await needRepo().listNotifications());
      },
      signIn: async (email, password) => {
        if (!supabase) throw new Error('Supabase is not configured.');
        enableSupabaseRepository();
        await AsyncStorage.removeItem('delos:demo');
        setDemoMode(false);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (email, password, adultAttested) => {
        if (!supabase) throw new Error('Supabase is not configured.');
        if (!adultAttested) throw new Error('You must confirm that you are 18 or older.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: Linking.createURL('/auth/signin'),
            data: { adult_attested_at: new Date().toISOString() },
          },
        });
        if (error) throw error;
        return data.session ? 'confirmed' : 'verify';
      },
      resetPassword: async (email) => {
        if (!supabase) throw new Error('Supabase is not configured.');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: Linking.createURL('/auth/update-password'),
        });
        if (error) throw error;
      },
      signOut: async () => {
        if (demoMode) await AsyncStorage.removeItem('delos:demo');
        else if (supabase) await supabase.auth.signOut();
        enableSupabaseRepository();
        setDemoMode(false);
        setUserId(null);
        setProfile(null);
      },
      finishOnboarding: async (next) => {
        if (!userId) throw new Error('Your session expired. Please sign in again.');
        const saved = { ...next, id: userId };
        await needRepo().saveProfile(saved);
        setProfile(saved);
      },
      updateProfile: async (next) => {
        await needRepo().saveProfile(next);
        setProfile(next);
      },
      uploadMedia: async (uri, mimeType, title) => {
        if (!userId) throw new Error('Sign in before uploading media.');
        await needRepo().uploadMedia(userId, uri, mimeType, title);
        const updated = await needRepo().getProfile(userId);
        if (updated) setProfile(updated);
      },
      like: async (id) => (await needRepo().like(id)).matched,
      pass: async (id) => needRepo().pass(id),
      block: async (id) => needRepo().block(id),
      deleteAccount: async () => {
        await needRepo().deleteAccount();
        await Promise.all([
          AsyncStorage.removeItem('delos:demo'),
          AsyncStorage.removeItem('delos:settings'),
        ]);
        if (!demoMode) await supabase?.auth.signOut({ scope: 'local' });
        enableSupabaseRepository();
        setDemoMode(false);
        setUserId(null);
        setProfile(null);
        setNotifications([]);
        setSettings(defaultSettings);
      },
      markNotificationsRead: async () => {
        await needRepo().markNotificationsRead();
        setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      },
      updateSettings: (next) =>
        setSettings((previous) => {
          const result = { ...previous, ...next };
          void AsyncStorage.setItem('delos:settings', JSON.stringify(result));
          void needRepo()
            .saveSettings(result)
            .catch(() => undefined);
          if (next.notifications === true && !demoMode)
            void requestPushToken()
              .then(
                (device) => device && needRepo().registerPushDevice(device.token, device.platform),
              )
              .catch(() => undefined);
          return result;
        }),
    }),
    [ready, userId, profile, notifications, settings, demoMode],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('useApp must be inside AppProvider');
  return value;
}
