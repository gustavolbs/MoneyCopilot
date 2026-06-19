"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme";
import { useThemeStore } from "@/store/themeStore";

export function ThemeToggleButton() {
  const { isDark, colors } = useTheme();
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);

  return (
    <button
      type="button"
      onClick={() => toggleDarkMode(colors.bg)}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--mc-line)] bg-[var(--mc-surface)] text-[var(--mc-muted)] transition-colors hover:bg-[var(--mc-subtle)]"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
