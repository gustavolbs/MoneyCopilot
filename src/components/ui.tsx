import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors, isDark } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, shadowOpacity: isDark ? 0 : 0.06 }, style]}>{children}</View>;
}

export function Title({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  return <Text style={[styles.title, { color: colors.ink }, style]}>{children}</Text>;
}

export function Label({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.muted }, style]}>{children}</Text>;
}

export function Button({ children, onPress, variant = 'primary', loading = false }: { children: ReactNode; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; loading?: boolean }) {
  const { colors } = useTheme();
  const foreground = variant === 'ghost' ? colors.ink : variant === 'primary' ? colors.bg : '#fff';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: colors.ink },
        variant === 'ghost' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
        variant === 'danger' && { backgroundColor: colors.red },
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : <Text style={[styles.buttonText, { color: foreground }]}>{children}</Text>}
    </Pressable>
  );
}

export function Field(props: { value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean; multiline?: boolean; keyboardType?: 'default' | 'email-address' | 'numeric' }) {
  const { colors } = useTheme();
  return <TextInput {...props} placeholderTextColor={colors.muted} style={[styles.field, { backgroundColor: colors.elevated, borderColor: colors.line, color: colors.ink }, props.multiline && styles.multiline]} />;
}

export function RowItem({ title, subtitle, right, onPress }: { title: string; subtitle?: string; right?: ReactNode; onPress?: () => void }) {
  const { colors } = useTheme();
  const Content = (
    <>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '500' }} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </>
  );
  return onPress ? <Pressable onPress={onPress} style={styles.rowItem}>{Content}</Pressable> : <View style={styles.rowItem}>{Content}</View>;
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 18,
    gap: 14,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  field: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  multiline: {
    minHeight: 104,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  rowItem: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
});
