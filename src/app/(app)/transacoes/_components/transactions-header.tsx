import { ReceiptText } from "lucide-react";

interface TransactionsHeaderProps {
  periodLabel: string;
  resultCount: number;
}

export function TransactionsHeader({
  periodLabel,
  resultCount,
}: TransactionsHeaderProps) {
  return (
    <header className="transactions-page-header">
      <div className="transactions-page-heading">
        <p>Movimentações</p>
        <h1>Transações</h1>
        <span>{periodLabel}</span>
      </div>

      <div className="transactions-result-count" aria-live="polite">
        <ReceiptText size={16} aria-hidden="true" />
        <strong>{resultCount}</strong>
        <span>{resultCount === 1 ? "resultado" : "resultados"}</span>
      </div>
    </header>
  );
}
