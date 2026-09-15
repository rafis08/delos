import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme';

export function PremiumPrompt({
  title,
  body,
  source,
}: {
  title: string;
  body: string;
  source: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. Explore Delos Amplified`}
      onPress={() => router.push({ pathname: '/premium', params: { source } })}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.mark}>
        <Ionicons name="sunny" size={21} color={colors.accentInk} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>DELOS AMPLIFIED</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color="#8B5000" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFF4CF',
    borderWidth: 1,
    borderColor: '#F2C35E',
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { color: '#8B5000', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 2 },
  body: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
});
