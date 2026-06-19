"use client";

import {
  Home,
  ArrowLeftRight,
  PiggyBank,
  BarChart2,
  Lightbulb,
  Settings,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Início", active: true },
  { icon: ArrowLeftRight, label: "Transações" },
  { icon: PiggyBank, label: "Cofrinhos" },
  { icon: BarChart2, label: "Orçamentos" },
  { icon: Lightbulb, label: "Insights" },
  { icon: Settings, label: "Ajustes" },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-[200px] flex-col border-r border-white/[0.06] bg-[#111827]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2C4.686 2 2 4.686 2 8s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6zm0 2.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 8.25a4.5 4.5 0 01-3.75-2.003C4.265 9.68 6.26 9.25 8 9.25c1.738 0 3.735.43 3.75 1.497A4.5 4.5 0 018 12.75z"
              fill="white"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">MoneyCopilot</p>
          <p className="text-[10px] text-[#6b7a99]">Painel financeiro</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {navItems.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-blue-600/20 font-medium text-blue-400"
                : "text-[#6b7a99] hover:bg-white/5 hover:text-[#a8b4cc]",
            )}
          >
            <Icon size={16} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/[0.06] px-4 py-4">
        <button className="flex w-full items-center gap-2.5 rounded-lg p-2 hover:bg-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e2a42] text-xs font-semibold text-blue-400">
            N
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-medium text-[#a8b4cc]">Usuário</p>
          </div>
          <ChevronDown size={14} className="text-[#6b7a99]" />
        </button>
      </div>
    </aside>
  );
}
