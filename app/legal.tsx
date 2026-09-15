import { StyleSheet, Text, View } from 'react-native';
import { Header, Screen } from '@/components/ui';
import { colors, space, type } from '@/theme';
export default function Legal() {
  return (
    <Screen>
      <Header eyebrow="DELOS" title="Privacy & community" />
      <Section
        title="Privacy"
        body="Your exact address and private email are never shown. Delos uses your approximate location only to calculate distance and stores account data securely in Supabase. Delete your account at any time from Settings."
      />
      <Section
        title="Community standards"
        body="Delos is for adults 18+. Respect boundaries, own the media you upload, avoid harassment, hate speech, impersonation and scams, and meet new collaborators in safe public places."
      />
      <Section
        title="Your controls"
        body="You can block or report a member from their profile, mute notifications, pause discovery visibility, and permanently delete your account."
      />
      <Text style={styles.note}>
        Beta summary. The counsel-reviewed public Privacy Policy and Terms URLs must be configured
        before store submission.
      </Text>
    </Screen>
  );
}
function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  section: {
    gap: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: space.lg,
  },
  title: { color: colors.text, ...type.h2 },
  body: { color: colors.muted, ...type.body },
  note: { color: colors.warning, fontSize: 12 },
});
