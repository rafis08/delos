import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme';

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

export function AudioSamplePlayer({ uri, title }: { uri?: string; title: string }) {
  const player = useAudioPlayer(uri || null, {
    updateInterval: 250,
    downloadFirst: Boolean(uri?.startsWith('http')),
    keepAudioSessionActive: true,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldPlayInBackground: false,
    });
  }, [player]);

  useEffect(() => {
    if (status.didJustFinish) void player.seekTo(0);
  }, [player, status.didJustFinish]);

  const duration = status.duration || 0;
  const progress = duration ? Math.min(100, (status.currentTime / duration) * 100) : 0;
  const toggle = async () => {
    if (!uri || !status.isLoaded) return;
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldPlayInBackground: false,
    });
    if (status.didJustFinish || (duration && status.currentTime >= duration))
      await player.seekTo(0);
    if (status.playing) player.pause();
    else player.play();
  };

  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${status.playing ? 'Pause' : 'Play'} ${title}`}
        accessibilityState={{ disabled: !uri || !status.isLoaded }}
        disabled={!uri || !status.isLoaded}
        onPress={() => void toggle()}
        style={({ pressed }) => [styles.play, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Ionicons
          name={!status.isLoaded ? 'hourglass' : status.playing ? 'pause' : 'play'}
          size={23}
          color={colors.accentInk}
        />
      </Pressable>
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {uri ? (
          <>
            <View
              accessibilityLabel={`${Math.round(progress)} percent played`}
              style={styles.track}
            >
              <View style={[styles.fill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.time}>
              {!status.isLoaded || status.isBuffering
                ? 'Loading audio…'
                : `${formatTime(status.currentTime)} / ${formatTime(duration)}`}
            </Text>
          </>
        ) : (
          <Text style={styles.unavailable}>Preview unavailable</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: '#FFF6DC',
    borderWidth: 1,
    borderColor: '#F2C35E',
  },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, gap: 6 },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  track: { height: 6, backgroundColor: colors.line, borderRadius: 99, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.accent, borderRadius: 99 },
  time: { color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  unavailable: { color: colors.muted, fontSize: 12 },
});
