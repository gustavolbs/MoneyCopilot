import * as Haptics from 'expo-haptics';
import { SendHorizonal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatCurrency } from '@/domain/normalize';
import { parseTransactionInput } from '@/domain/parser';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';
import { KEYBOARD_ACCESSORY_ID } from './ui';

export function QuickEntry() {
  const [value, setValue] = useState('');
  const { colors } = useTheme();
  const { addQuickInput, categories, rules, accounts } = useAppStore();
  const preview = useMemo(() => (value.trim() ? parseTransactionInput(value, { categories, rules, accounts }) : []), [accounts, categories, rules, value]);

  const submit = async () => {
    if (!value.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addQuickInput(value);
    setValue('');
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Adicionar lancamento..."
          placeholderTextColor={colors.muted}
          selectionColor={colors.blue}
          multiline
          style={[styles.input, { color: colors.ink }]}
          returnKeyType="send"
          onSubmitEditing={submit}
          inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
        />
        <Pressable onPress={submit} style={[styles.send, { backgroundColor: colors.ink }]}>
          <SendHorizonal color={colors.bg} size={20} />
        </Pressable>
      </View>
      {preview.length > 0 ? (
        <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          {preview.slice(0, 4).map((item) => (
            <View key={item.raw} style={[styles.previewRow, { borderBottomColor: colors.line }]}>
              <Text style={[styles.previewTitle, { color: colors.ink }]} numberOfLines={1}>{item.description}</Text>
              <Text style={[styles.previewAmount, { color: item.type === 'income' ? colors.green : item.type === 'transfer' ? colors.blue : colors.red }]}>
                {item.type === 'income' ? '+' : item.type === 'transfer' ? '' : '-'}{formatCurrency(item.amount)}
              </Text>
              <Text style={[styles.previewCat, { color: colors.muted }]}>
                {item.type === 'transfer' ? `Transferencia${item.transfer_account_name_hint ? ` para ${item.transfer_account_name_hint}` : ''}` : item.category_name} · {Math.round(item.confidence * 100)}%
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewRow: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewTitle: {
    fontWeight: '500',
    fontSize: 14,
  },
  previewAmount: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '600',
  },
  previewCat: {
    marginTop: 2,
    fontSize: 12,
  },
});
