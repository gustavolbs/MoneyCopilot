import { Settings } from "lucide-react";

import { Label } from "@/components/ui";

import { SyncPill } from "../../_components/SyncPill";

export function SettingsHeader() {
  return (
    <header className="settings-page-header">
      <div className="settings-page-heading">
        <p>Organização do app</p>
        <h1>Ajustes</h1>
        <span>Preferências, cadastros e dados compartilhados</span>
      </div>

      <div className="settings-page-actions">
        <span className="settings-page-badge">
          <Settings size={15} aria-hidden="true" />
          <Label>Configurações</Label>
        </span>
        <SyncPill />
      </div>
    </header>
  );
}
