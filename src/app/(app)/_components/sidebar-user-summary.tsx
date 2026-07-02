import { ChevronDown } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import type { AppUserSummary } from "./app-shell-types";

export function SidebarUserSummary({ user }: { user: AppUserSummary }) {
  return (
    <div className="sidebar-user">
      <Avatar size="sm" className="sidebar-avatar">
        <AvatarFallback>{user.initial}</AvatarFallback>
      </Avatar>
      <div className="sidebar-user-copy">
        <span>{user.name}</span>
        <small>Conta pessoal</small>
      </div>
      <ChevronDown size={14} aria-hidden="true" />
    </div>
  );
}
