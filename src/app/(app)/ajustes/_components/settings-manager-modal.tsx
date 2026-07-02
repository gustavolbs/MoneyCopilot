"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/lib/theme";

type SettingsManagerModalProps = {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  subtitle: string;
  title: string;
};

export function SettingsManagerModal({
  children,
  className,
  onClose,
  subtitle,
  title,
}: SettingsManagerModalProps) {
  const { colors } = useTheme();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={["settings-manager-modal", className].filter(Boolean).join(" ")}
        style={{ backgroundColor: colors.bg, borderColor: colors.line }}
      >
        <header>
          <div>
            <DialogTitle id="settings-manager-title">{title}</DialogTitle>
            <DialogDescription style={{ color: colors.muted }}>
              {subtitle}
            </DialogDescription>
          </div>
        </header>
        <Separator />
        <div className="settings-manager-content">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
