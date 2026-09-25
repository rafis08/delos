import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { PanResponder, StyleProp, View, ViewStyle } from 'react-native';
import { Screen } from './ui';

export type MainTabName = 'discover' | 'matches' | 'messages' | 'notifications' | 'me';

const tabs: MainTabName[] = ['discover', 'matches', 'messages', 'notifications', 'me'];

export function MainTabScreen({
  tab,
  children,
  scroll = true,
  style,
}: React.PropsWithChildren<{
  tab: MainTabName;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 30 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.8,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) < 72 || Math.abs(gesture.vx) < 0.18) return;
          const current = tabs.indexOf(tab);
          const next = gesture.dx < 0 ? current + 1 : current - 1;
          const destination = tabs[next];
          if (destination) router.navigate(`/(tabs)/${destination}`);
        },
      }),
    [tab],
  );

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Screen scroll={scroll} style={style} edges={['top', 'left', 'right']}>
        {children}
      </Screen>
    </View>
  );
}
