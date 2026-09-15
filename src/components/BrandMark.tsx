import { Image } from 'expo-image';
import React from 'react';
import { ImageStyle, StyleProp, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export function BrandMark({ size = 44, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      accessibilityLabel="Delos guardian logo"
      source={require('../../assets/delos-guardian.png')}
      contentFit="contain"
      transition={150}
      style={[{ width: size, height: size }, style]}
    />
  );
}

export function BrandLockup({
  inverse = false,
  slogan = false,
  compact = false,
}: {
  inverse?: boolean;
  slogan?: boolean;
  compact?: boolean;
}) {
  return (
    <View accessibilityLabel="Delos — where music is born" style={styles.lockup}>
      <BrandMark size={compact ? 34 : 46} />
      <View>
        <Text
          style={[styles.wordmark, compact && styles.wordmarkCompact, inverse && styles.inverse]}
        >
          DELOS
        </Text>
        {slogan && (
          <Text style={[styles.slogan, inverse && styles.sloganInverse]}>where music is born</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  wordmark: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  wordmarkCompact: { fontSize: 17, lineHeight: 19, letterSpacing: 3.2 },
  inverse: { color: colors.accent },
  slogan: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.45,
  },
  sloganInverse: { color: '#F7E6C8' },
});
