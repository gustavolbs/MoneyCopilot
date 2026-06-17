import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatCurrency } from '@/domain/normalize';
import { Category, Transaction, TransactionType } from '@/domain/types';
import { useTheme } from '@/lib/theme';

import { Button, Field, Label } from './ui';

type Props = {
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSave: (patch: Partial<Pick<Transaction, 'description' | 'amount' | 'type' | 'category_id' | 'notes'>>) => Promise<void>;
  onDelete: () => Promise<void>;
};

const typeOptions: Array<{ label: string; value: TransactionType }> = [
  { label: 'Despesa', value: 'expense' },
  { label: 'Receita', value: 'income' },
  { label: 'Transferencia', value: 'transfer' },
];

export function TransactionEditor({ transaction, categories, onClose, onSave, onDelete }: Props) {
  const { colors } = useTheme();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!transaction) return;
    setDescription(transaction.description);
    setAmount(String(transaction.amount).replace('.', ','));
    setType(transaction.type);
    setCategoryId(transaction.category_id);
    setNotes(transaction.notes ?? '');
  }, [transaction]);

  const availableCategories = useMemo(
    () => categories.filter((category) => type === 'transfer' || category.type === type || category.type === 'both'),
    [categories, type],
  );

  if (!transaction) return null;

  const parsedAmount = Number(amount.replace(/\./g, '').replace(',', '.'));
  const canSave = description.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount >= 0;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modal, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.ink }]}>Editar transacao</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{formatCurrency(transaction.amount)}</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.close, { backgroundColor: colors.subtle }]}>
            <X size={20} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.group}>
            <Label>Descricao</Label>
            <Field value={description} onChangeText={setDescription} placeholder="Nome da transacao" />
          </View>

          <View style={styles.group}>
            <Label>Valor</Label>
            <Field value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="numeric" />
          </View>

          <View style={styles.group}>
            <Label>Tipo</Label>
            <View style={styles.segmentRow}>
              {typeOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  style={[styles.segment, { backgroundColor: type === option.value ? colors.ink : colors.subtle }]}
                >
                  <Text style={{ color: type === option.value ? colors.bg : colors.ink, fontWeight: '500' }}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {type !== 'transfer' ? (
            <View style={styles.group}>
              <Label>Categoria</Label>
              <View style={styles.categoryGrid}>
                {availableCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: categoryId === category.id ? category.color : colors.subtle,
                        borderColor: categoryId === category.id ? category.color : colors.line,
                      },
                    ]}
                  >
                    <Text style={{ color: categoryId === category.id ? '#fff' : colors.ink, fontSize: 13, fontWeight: '500' }}>{category.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.group}>
            <Label>Observacao</Label>
            <Field value={notes} onChangeText={setNotes} placeholder="Opcional" multiline />
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.line }]}>
          <Button onPress={() => void onDelete()} variant="ghost">Excluir</Button>
          <Button
            onPress={() => {
              if (!canSave) return;
              void onSave({
                description: description.trim(),
                amount: parsedAmount,
                type,
                category_id: type === 'transfer' ? null : categoryId,
                notes: notes.trim() || null,
              });
            }}
          >
            Salvar
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { marginTop: 3, fontSize: 13 },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 18, paddingBottom: 120 },
  group: { gap: 8 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
});
