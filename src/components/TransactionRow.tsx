import { CategoryBadge } from "@/components/CategoryBadge";
import { transactionEffectiveDate } from "@/domain/finance";
import { formatCurrency } from "@/domain/normalize";
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
    transaction.type === "transfer" ? "Transferencia" : "Outros";
  const amount = `${transaction.type === "income" ? "+" : transaction.type === "transfer" ? "" : "-"}${formatCurrency(transaction.amount)}`;
  const card = accounts.find(
    (account) =>
      account.id === transaction.account_id && account.type === "credit_card",
  );
  const paymentLabel =
    transaction.type === "expense"
      ? transaction.payment_method === "credit_card"
        ? (card?.name ?? "Cartao de credito")
        : "A vista"
      : "-";
  const effectiveDate = transactionEffectiveDate(transaction, accounts);
  const paymentDetail =
    transaction.type === "expense" &&
    transaction.payment_method === "credit_card"
      ? `Fatura em ${effectiveDate.split("-").reverse().join("/")}`
      : null;

  return (
    <tr className="transaction-table-row" onClick={onPress}>
      <td>
        <button
          type="button"
          className="transaction-name-button"
          onClick={onPress}
        >
          <span className="transaction-title" style={{ color: colors.ink }}>
            {transaction.description}
          </span>
          <span className="transaction-date" style={{ color: colors.muted }}>
            {transaction.transaction_date}
          </span>
        </button>
      </td>
      <td>
        <CategoryBadge
          category={category}
          label={category?.name ?? fallbackLabel}
          compact
        />
      </td>
      <td className="transaction-payment-cell">
        <span style={{ color: colors.ink }}>{paymentLabel}</span>
        {paymentDetail ? (
          <small style={{ color: colors.muted }}>{paymentDetail}</small>
        ) : null}
      </td>
      <td className="transaction-amount-cell" style={{ color: amountColor }}>
        {amount}
      </td>
    </tr>
  );
}
