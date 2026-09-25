import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '@/theme';
import { MusicianProfile } from '@/types';
import { ProfileCard } from './ProfileCard';

type Props = {
  profile: MusicianProfile;
  score: number;
  explanation: string;
  compact?: boolean;
  onDecision: (decision: 'like' | 'pass') => void;
};

export function SwipeableProfileCard({ profile, score, explanation, compact, onDecision }: Props) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const decisionLocked = useSharedValue(false);
  const threshold = Math.min(width * 0.24, 110);

  const finishDecision = (decision: 'like' | 'pass') => {
    onDecision(decision);
  };

  const gesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      if (decisionLocked.value) return;
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.16;
    })
    .onEnd((event) => {
      const projected = translateX.value + event.velocityX * 0.12;
      if (Math.abs(projected) >= threshold) {
        decisionLocked.value = true;
        const decision = projected > 0 ? 'like' : 'pass';
        const destination = projected > 0 ? width * 1.35 : -width * 1.35;
        translateX.value = withTiming(destination, { duration: 220 }, (finished) => {
          if (finished) runOnJS(finishDecision)(decision);
        });
        translateY.value = withTiming(event.translationY * 0.35, { duration: 220 });
      } else {
        translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 16, stiffness: 180 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 22}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, translateX.value / threshold)),
    transform: [{ scale: 0.9 + Math.max(0, translateX.value / threshold) * 0.1 }],
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, -translateX.value / threshold)),
    transform: [{ scale: 0.9 + Math.max(0, -translateX.value / threshold) * 0.1 }],
  }));

  return (
    <View style={styles.deck}>
      <View style={styles.backCard} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          <ProfileCard
            profile={profile}
            score={score}
            explanation={explanation}
            compact={compact}
          />
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.like, likeStyle]}>
            <Text style={styles.likeText}>CONNECT</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.stamp, styles.pass, passStyle]}>
            <Text style={styles.passText}>PASS</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: { flex: 1 },
  backCard: {
    position: 'absolute',
    top: 7,
    bottom: -5,
    left: 8,
    right: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.line,
    transform: [{ scale: 0.975 }],
  },
  card: { flex: 1 },
  stamp: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.9)',
  },
  like: { left: 20, borderColor: '#C98A12', transform: [{ rotate: '-8deg' }] },
  pass: { right: 20, borderColor: colors.danger, transform: [{ rotate: '8deg' }] },
  likeText: { color: '#8A5900', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  passText: { color: colors.danger, fontSize: 22, fontWeight: '900', letterSpacing: 2 },
});
