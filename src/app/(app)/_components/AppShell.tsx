"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

import { useTheme } from "@/lib/theme";
import { useAppStore } from "@/store/appStore";

import { DesktopSidebar } from "./desktop-sidebar";
import { MobileNavigation } from "./mobile-navigation";
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
  const user = {
    name: userName,
    initial: userName.trim().charAt(0).toUpperCase() || "U",
  };
  const activeMobileTab = useRef<HTMLAnchorElement | null>(null);
  const shellClassName = `app-shell${pathname.startsWith("/cofrinhos") ? " app-shell-reserves" : ""}`;

  useEffect(() => {
    activeMobileTab.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [pathname]);

  return (
    <div className={shellClassName} style={{ background: colors.bg }}>
      <div className="app-content">
        <MobileNavigation activeTabRef={activeMobileTab} pathname={pathname} />
        <MobileRouteViewport>{children}</MobileRouteViewport>
      </div>
      <DesktopSidebar pathname={pathname} user={user} />
    </div>
  );
}
