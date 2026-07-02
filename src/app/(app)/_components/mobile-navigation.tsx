import { MessageSquare, SlidersHorizontal } from "lucide-react";

import { SyncPill } from "./SyncPill";
import { ThemeToggleButton } from "./ThemeToggleButton";
import type { ActiveNavigationRef } from "./app-shell-types";
import { appNavigation } from "./app-navigation";
import { isNavigationItemActive, NavigationLinkItem } from "./navigation-link-item";

export function MobileNavigation({
  activeTabRef,
  pathname,
}: {
  activeTabRef: ActiveNavigationRef;
  pathname: string;
}) {
  return (
    <header className="mobile-brand-bar">
      <div className="mobile-shell-header-row">
        <div className="mobile-shell-sync">
          <SyncPill />
        </div>

        <div className="mobile-shell-brand">
          <strong className="mobile-shell-title">MoneyCopilot</strong>
          <span>Controle financeiro</span>
        </div>

        <div className="mobile-shell-actions">
          <span
            className="mobile-shell-ghost-button"
            aria-hidden="true"
          >
            <SlidersHorizontal size={17} />
          </span>
          <ThemeToggleButton />
        </div>
      </div>

      <nav
        className="mobile-route-tabs"
        aria-label="Navegação por páginas"
        data-swipe-ignore
      >
        {appNavigation.map((item) => {
          const active = isNavigationItemActive(item, pathname);

          return (
            <NavigationLinkItem
              key={item.href}
              active={active}
              item={item}
              linkRef={active ? activeTabRef : undefined}
              variant="mobile"
            />
          );
        })}
      </nav>

      <div className="mobile-shell-context" aria-hidden="true">
        <span>Deslize para trocar de página</span>
        <MessageSquare size={16} />
      </div>
    </header>
  );
}
