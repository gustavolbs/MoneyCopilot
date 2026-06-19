"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

import { SyncPill } from "./SyncPill";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { appNavigation } from "./app-navigation";
import { MobileRouteViewport } from "./MobileRouteViewport";

export function AppShell({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const pathname = usePathname();
  const session = useAppStore((state) => state.session);
  const userName = String(
    session?.user.user_metadata.full_name ??
      session?.user.email?.split("@")[0] ??
      "Usuário",
  );
  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";
  const activeMobileTab = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    activeMobileTab.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [pathname]);

  return (
    <div className="app-shell" style={{ background: colors.bg }}>
      <div className="app-content">
        <header className="mobile-brand-bar">
          <div className="mobile-shell-header-row">
            <div className="mobile-shell-sync">
              <SyncPill />
            </div>
            <strong className="mobile-shell-title">MoneyCopilot</strong>
            <ThemeToggleButton />
          </div>
          <nav
            className="mobile-route-tabs"
            aria-label="Navegação por páginas"
            data-swipe-ignore
          >
            {appNavigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={active ? activeMobileTab : undefined}
                  className={`mobile-route-tab${active ? " active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.mobileLabel}
                </Link>
              );
            })}
          </nav>
        </header>
        <MobileRouteViewport>{children}</MobileRouteViewport>
      </div>
      <aside
        className="shell-navigation"
        style={{ background: colors.surface, borderColor: colors.line }}
      >
        <div className="desktop-brand">
          <span className="sidebar-brand-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6Zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 8.25a4.5 4.5 0 0 1-3.75-2.003C4.265 9.68 6.26 9.25 8 9.25c1.738 0 3.735.43 3.75 1.497A4.5 4.5 0 0 1 8 12.75Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div className="sidebar-brand-copy">
            <strong>MoneyCopilot</strong>
            <small>Painel financeiro</small>
          </div>
        </div>
        <nav
          className="tab-bar"
          aria-label="Navegação principal"
          style={{ background: colors.surface, borderColor: colors.line }}
        >
          {appNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`tab-button${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
                style={{ color: active ? colors.ink : colors.muted }}
              >
                <Icon size={21} color={active ? colors.ink : colors.muted} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <Avatar size="sm" className="sidebar-avatar">
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
          <span>{userName}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
      </aside>
    </div>
  );
}
