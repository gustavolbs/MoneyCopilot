import { PiggyBank } from "lucide-react";

interface ReservesHeaderProps {
  accountCount: number;
  reserveCount: number;
}

export function ReservesHeader({
  accountCount,
  reserveCount,
}: ReservesHeaderProps) {
  return (
    <header className="reserves-page-header">
      <div className="reserves-page-heading">
        <p>Patrimonio separado</p>
        <h1>Cofrinhos</h1>
        <span>
          Movimente cofrinhos, contas correntes, carteira e outras fontes de
          saldo sem misturar com o fluxo mensal.
        </span>
      </div>
      <div className="reserves-header-badge">
        <PiggyBank size={17} />
        <strong>{reserveCount}</strong>
        <span>de {accountCount} fontes</span>
      </div>
    </header>
  );
}
