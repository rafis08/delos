import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '@/theme';

export function Screen({
  children,
  scroll = true,
  style,
}: React.PropsWithChildren<{ scroll?: boolean; style?: StyleProp<ViewStyle> }>) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.content, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }, style]}>{children}</View>
  );
  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}
export function Header({
  title,
  eyebrow,
  right,
}: {
  title: string;
  eyebrow?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.h1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && { opacity: 0.72 },
        disabled && { opacity: 0.4 },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={
            variant === 'primary'
              ? colors.accentInk
              : variant === 'danger'
                ? colors.white
                : colors.text
          }
        />
      )}
      <Text style={[styles.buttonText, variant === 'primary' && { color: colors.accentInk }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
  accent,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        accent && { backgroundColor: colors.accent, borderColor: colors.accent },
        danger && { borderColor: colors.danger },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <Ionicons
        name={icon}
        size={26}
        color={accent ? colors.accentInk : danger ? colors.danger : colors.text}
      />
    </Pressable>
  );
}
export function Field({
  label,
  error,
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; error?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[
          styles.input,
          multiline && { minHeight: 104, textAlignVertical: 'top' },
          error && { borderColor: colors.danger },
        ]}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : undefined}
      accessibilityState={onPress ? { checked: selected } : undefined}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && { color: colors.accentInk }]}>{label}</Text>
    </Pressable>
  );
}
export function Chips({
  items,
  selected = [],
  onToggle,
}: {
  items: string[];
  selected?: string[];
  onToggle?: (item: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {items.map((item, index) => (
        <Chip
          key={`${item}-${index}`}
          label={item}
          selected={selected.includes(item)}
          onPress={onToggle ? () => onToggle(item) : undefined}
        />
      ))}
    </View>
  );
}
export function Avatar({
  initials,
  color,
  size = 52,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <View
      accessibilityLabel="Profile image"
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <View style={styles.avatarShade} />
      <Text style={[styles.avatarText, { fontSize: size * 0.3 }]}>{initials}</Text>
    </View>
  );
}
export function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={styles.settingRow}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: colors.accent }}
          thumbColor={colors.text}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      )}
    </Pressable>
  );
}
export function StateView({
  icon,
  title,
  body,
  action,
  loading,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <View style={styles.state}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} />
      ) : (
        <Ionicons name={icon || 'radio-outline'} size={42} color={colors.accent} />
      )}
      <Text style={styles.h2}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {action}
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  content: { padding: space.lg, gap: space.lg, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  h1: { color: colors.text, ...type.h1 },
  h2: { color: colors.text, ...type.h2 },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 22,
    borderWidth: 1,
  },
  button_primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  button_secondary: { backgroundColor: colors.raised, borderColor: colors.line },
  button_danger: { backgroundColor: colors.danger, borderColor: colors.danger },
  button_ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  iconButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  input: {
    minHeight: 52,
    color: colors.text,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  error: { color: colors.danger, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarShade: {
    position: 'absolute',
    width: '140%',
    height: '50%',
    backgroundColor: 'rgba(0,0,0,.18)',
    transform: [{ rotate: '-15deg' }],
  },
  avatarText: { color: colors.accentInk, fontWeight: '900' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 70,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rowSubtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  state: {
    flex: 1,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 30,
  },
  stateBody: { color: colors.muted, ...type.body, textAlign: 'center', maxWidth: 380 },
});
export const ui = styles;
