import {
  BarChart3,
  Home,
  Lightbulb,
  type LucideIcon,
  PiggyBank,
  Settings,
  WalletCards,
} from "lucide-react";
import type { Route } from "next";

export type AppNavigationItem = {
  href: Route;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
};

export const appNavigation: AppNavigationItem[] = [
  { href: "/", label: "Início", mobileLabel: "Dashboard", icon: Home },
  {
    href: "/transacoes",
    label: "Transações",
    mobileLabel: "Transações",
    icon: WalletCards,
  },
  {
    href: "/cofrinhos",
    label: "Cofrinhos",
    mobileLabel: "Cofrinhos",
    icon: PiggyBank,
  },
  {
    href: "/orcamentos",
    label: "Orçamentos",
    mobileLabel: "Orçamentos",
    icon: BarChart3,
  },
  {
    href: "/insights",
    label: "Insights",
    mobileLabel: "Insights",
    icon: Lightbulb,
  },
  {
    href: "/ajustes",
    label: "Ajustes",
    mobileLabel: "Ajustes",
    icon: Settings,
  },
];

export function navigationIndex(pathname: string) {
  return appNavigation.findIndex(({ href }) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href),
  );
}
