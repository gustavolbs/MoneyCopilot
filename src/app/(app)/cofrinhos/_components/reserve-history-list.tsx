import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";

import { formatCurrency, formatDate } from "@/domain/normalize";
import type { Transaction } from "@/domain/types";

interface ReserveHistoryListProps {
  entries: Array<{ transaction: Transaction; delta: number; balance: number }>;
}

export function ReserveHistoryList({ entries }: ReserveHistoryListProps) {
  return (
    <section className="reserves-panel reserves-history-panel">
      <div className="reserves-section-heading">
        <div>
          <span>Historico de evolução</span>
          <strong>{entries.length} movimento(s)</strong>
        </div>
        <History size={19} />
      </div>

      {entries.length ? (
        <div className="reserves-history-list">
          {entries.map(({ transaction, delta, balance }) => (
            <article className="reserves-history-row" key={transaction.id}>
              <span
                className="reserves-history-icon"
                data-positive={delta > 0}
              >
                {delta > 0 ? (
                  <ArrowDownLeft size={16} />
                ) : (
                  <ArrowUpRight size={16} />
                )}
              </span>
              <div className="reserves-history-copy">
                <strong>{transaction.description}</strong>
                <small>
                  {movementLabel(transaction, delta)} ·{" "}
                  {formatDate(transaction.transaction_date)}
                </small>
              </div>
              <div className="reserves-history-amount">
                <strong data-positive={delta > 0}>
                  {delta > 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(delta))}
                </strong>
                <small>Saldo {formatCurrency(balance)}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="reserves-empty">
          Nenhum movimento registrado nesta fonte de saldo.
        </p>
      )}
    </section>
  );
}

function movementLabel(transaction: Transaction, delta: number) {
  if (
    transaction.notes?.startsWith("reserve_movement:position") ||
    transaction.notes?.startsWith("account_movement:position")
  )
    return delta > 0 ? "Rendimento calculado" : "Variação negativa calculada";
  if (
    transaction.notes?.startsWith("account_movement:income") ||
    transaction.notes?.startsWith("reserve_movement:income")
  )
    return "Saldo adicionado";
  if (
    transaction.type === "income" &&
    transaction.category_id === "cat_income_yield"
  )
    return "Rendimento";
  if (transaction.type === "transfer") return delta > 0 ? "Aporte" : "Saque";
  return delta > 0 ? "Entrada patrimonial" : "Saída patrimonial";
}
