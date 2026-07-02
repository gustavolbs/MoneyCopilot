import Link from "next/link";
import type { Ref } from "react";

import type { AppNavigationItem } from "./app-navigation";

export function isNavigationItemActive(item: AppNavigationItem, pathname: string) {
  return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
}

export function NavigationLinkItem({
  active,
  item,
  linkRef,
  variant,
}: {
  active: boolean;
  item: AppNavigationItem;
  linkRef?: Ref<HTMLAnchorElement>;
  variant: "desktop" | "mobile";
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      ref={linkRef}
      className={
        variant === "desktop"
          ? `sidebar-nav-link${active ? " active" : ""}`
          : `mobile-route-tab${active ? " active" : ""}`
      }
      aria-current={active ? "page" : undefined}
    >
      <span className={variant === "desktop" ? "sidebar-nav-icon" : "mobile-route-icon"}>
        <Icon size={variant === "desktop" ? 18 : 15} aria-hidden="true" />
      </span>
      <span>{variant === "desktop" ? item.label : item.mobileLabel}</span>
    </Link>
  );
}
