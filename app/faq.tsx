import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header, Screen } from '@/components/ui';
import { colors, radius, space } from '@/theme';

const questions = [
  ['Who can use Delos?', 'Delos is for adults 18 and older. Accounts believed to belong to minors should be reported immediately.'],
  ['Who can see my profile?', 'Signed-in members can see the profile details you publish. Your email and precise coordinates are never displayed. Pause discovery visibility in Settings at any time.'],
  ['How does matching work?', 'A conversation opens only after both musicians like each other. Compatibility uses genres, roles, distance, schedule, commitment, and goals.'],
  ['How do I report or block someone?', 'Open their full profile, tap the menu, then choose Report or Block. Blocking immediately removes direct access between both accounts.'],
  ['Can I delete or export my data?', 'Yes. Open Settings, then Data & account. Export creates a copy of your account data; deletion permanently removes the account and associated content.'],
  ['How do I stay safe at a rehearsal?', 'Meet at a public or established rehearsal space, tell someone your plan, arrange your own transportation, and leave if anything feels wrong.'],
  ['What should I include in a support request?', 'Describe what you expected, what happened, and the screen involved. You can optionally attach app, build, and device details—never passwords or payment-card information.'],
] as const;

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen>
      <Header eyebrow="HELP CENTER" title="Frequently asked questions" />
      {questions.map(([question, answer], index) => (
        <Pressable
          key={question}
          accessibilityRole="button"
          accessibilityState={{ expanded: open === index }}
          onPress={() => setOpen(open === index ? null : index)}
          style={styles.item}
        >
          <View style={styles.row}>
            <Text style={styles.question}>{question}</Text>
            <Ionicons name={open === index ? 'remove' : 'add'} size={22} color={colors.accent} />
          </View>
          {open === index && <Text style={styles.answer}>{answer}</Text>}
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { backgroundColor: colors.panel, borderRadius: radius.md, padding: space.md, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  question: { color: colors.text, fontSize: 16, fontWeight: '900', flex: 1 },
  answer: { color: colors.muted, lineHeight: 21 },
});
