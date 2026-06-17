import { formatCurrency } from '@/domain/normalize';
import { Category, Transaction } from '@/domain/types';
import { useTheme } from '@/lib/theme';

export function TransactionRow({ transaction, category, onPress }: { transaction: Transaction; category?: Category; onPress?: () => void }) {
  const { colors } = useTheme();
  const amountColor = transaction.type === 'income' ? colors.green : transaction.type === 'transfer' ? colors.blue : colors.red;
  const meta = category?.name ?? (transaction.type === 'transfer' ? 'Transferencia' : 'Outros');

  return (
    <button type="button" onClick={onPress} className="transaction-row">
      <span className="transaction-dot" style={{ backgroundColor: category?.color ?? colors.subtle }} />
      <span className="transaction-main">
        <span className="transaction-title" style={{ color: colors.ink }}>{transaction.description}</span>
        <span className="transaction-meta" style={{ color: colors.muted }}>{meta} · {transaction.transaction_date}</span>
      </span>
      <span className="transaction-amount" style={{ color: amountColor }}>
        {transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '' : '-'}{formatCurrency(transaction.amount)}
      </span>
    </button>
  );
}
