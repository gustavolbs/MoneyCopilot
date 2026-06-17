import { CategoryBadge } from '@/components/CategoryBadge';
import { formatCurrency } from '@/domain/normalize';
import { Category, Transaction } from '@/domain/types';
import { useTheme } from '@/lib/theme';

export function TransactionRow({ transaction, category, onPress }: { transaction: Transaction; category?: Category; onPress?: () => void }) {
  const { colors } = useTheme();
  const amountColor = transaction.type === 'income' ? colors.green : transaction.type === 'transfer' ? colors.blue : colors.red;
  const fallbackLabel = transaction.type === 'transfer' ? 'Transferencia' : 'Outros';
  const amount = `${transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '' : '-'}${formatCurrency(transaction.amount)}`;

  return (
    <tr className="transaction-table-row" onClick={onPress}>
      <td>
        <button type="button" className="transaction-name-button" onClick={onPress}>
          <span className="transaction-title" style={{ color: colors.ink }}>{transaction.description}</span>
          <span className="transaction-date" style={{ color: colors.muted }}>{transaction.transaction_date}</span>
        </button>
      </td>
      <td>
        <CategoryBadge category={category} label={category?.name ?? fallbackLabel} compact />
      </td>
      <td className="transaction-amount-cell" style={{ color: amountColor }}>{amount}</td>
    </tr>
  );
}
