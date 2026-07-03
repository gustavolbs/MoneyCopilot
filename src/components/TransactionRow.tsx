import { CategoryBadge } from "@/components/CategoryBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { transactionEffectiveDate } from "@/domain/finance";
import { formatCurrency, formatDate } from "@/domain/normalize";
import { Account, Category, Transaction } from "@/domain/types";
import { useTheme } from "@/lib/theme";

export function TransactionRow({
  transaction,
  category,
  accounts = [],
  onPress,
}: {
  transaction: Transaction;
  category?: Category;
  accounts?: Account[];
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const amountColor =
    transaction.type === "income"
      ? colors.green
      : transaction.type === "transfer"
        ? colors.blue
        : colors.red;
  const fallbackLabel =
    transaction.type === "transfer" ? "Transferência" : "Outros";
  const amount = `${transaction.type === "income" ? "+" : transaction.type === "transfer" ? "" : "-"}${formatCurrency(transaction.amount)}`;
  const card = accounts.find(
    (account) =>
      account.id === transaction.account_id && account.type === "credit_card",
  );
  const paymentLabel =
    transaction.type === "expense"
      ? transaction.payment_method === "credit_card"
        ? (card?.name ?? "Cartão de crédito")
        : "À vista"
      : "-";
  const effectiveDate = transactionEffectiveDate(transaction, accounts);
  const paymentDetail =
    transaction.type === "expense" &&
    transaction.payment_method === "credit_card"
      ? `Fatura em ${formatDate(effectiveDate)}`
      : null;
  const isRecurring =
    transaction.source === "recurring" || Boolean(transaction.recurrence_id);

  return (
    <TableRow className="transaction-table-row" onClick={onPress}>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          className="transaction-name-button"
          onClick={onPress}
        >
          <span className="transaction-title" style={{ color: colors.ink }}>
            {transaction.description}
          </span>
          <span className="transaction-date" style={{ color: colors.muted }}>
            {formatDate(transaction.transaction_date)}
          </span>
        </Button>
      </TableCell>
      <TableCell>
        <CategoryBadge
          category={category}
          label={category?.name ?? fallbackLabel}
          compact
        />
      </TableCell>
      <TableCell className="transaction-payment-cell">
        {transaction.type === "expense" ? (
          <Badge variant="outline" className={`payment-badge ${transaction.payment_method === "credit_card" ? "credit-card" : "cash"}`} title={paymentLabel}>
            <span aria-hidden="true">{transaction.payment_method === "credit_card" ? "💳" : "💵"}</span>
            <span className="payment-badge-label">{paymentLabel}</span>
          </Badge>
        ) : (
          <span className="payment-empty" style={{ color: colors.muted }}>-</span>
        )}
        {paymentDetail ? (
          <small style={{ color: colors.muted }}>{paymentDetail}</small>
        ) : null}
        {isRecurring ? (
          <small className="transaction-recurring-table-badge">
            Recorrente
          </small>
        ) : null}
      </TableCell>
      <TableCell className="transaction-amount-cell" style={{ color: amountColor }}>
        {amount}
      </TableCell>
    </TableRow>
  );
}
