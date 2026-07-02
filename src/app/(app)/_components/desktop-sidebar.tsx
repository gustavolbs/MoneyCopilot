import { Activity, Sparkles } from "lucide-react";

import { SyncPill } from "./SyncPill";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { AppBrand } from "./app-brand";
import type { AppUserSummary } from "./app-shell-types";
import { appNavigation } from "./app-navigation";
import { isNavigationItemActive, NavigationLinkItem } from "./navigation-link-item";
import { SidebarUserSummary } from "./sidebar-user-summary";

export function DesktopSidebar({
  pathname,
  user,
}: {
  pathname: string;
  user: AppUserSummary;
}) {
  return (
    <aside className="shell-navigation" aria-label="Navegação principal">
      <AppBrand />

      <div className="sidebar-status-card">
        <span className="sidebar-status-icon" aria-hidden="true">
          <Sparkles size={16} />
        </span>
        <div>
          <strong>Visão geral</strong>
          <small>Controle financeiro em tempo real</small>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Páginas">
        <span className="sidebar-nav-label">Menu</span>
        <div className="sidebar-nav-list">
          {appNavigation.map((item) => (
            <NavigationLinkItem
              key={item.href}
              active={isNavigationItemActive(item, pathname)}
              item={item}
              variant="desktop"
            />
          ))}
        </div>
      </nav>

      <div className="sidebar-actions">
        <div className="sidebar-actions-label">
          <Activity size={14} aria-hidden="true" />
          <span>Status</span>
        </div>
        <SyncPill />
        <ThemeToggleButton />
      </div>

      <SidebarUserSummary user={user} />
    </aside>
  );
}
