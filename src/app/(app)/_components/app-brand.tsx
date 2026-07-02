import { WalletCards } from "lucide-react";

export function AppBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "app-brand app-brand-compact" : "app-brand"}>
      <span className="app-brand-mark" aria-hidden="true">
        <WalletCards size={compact ? 16 : 18} />
      </span>
      <div className="app-brand-copy">
        <strong>MoneyCopilot</strong>
        <small>Painel financeiro</small>
      </div>
    </div>
  );
}
