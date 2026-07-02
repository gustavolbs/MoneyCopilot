import type { RefObject } from "react";

export type AppUserSummary = {
  name: string;
  initial: string;
};

export type ActiveNavigationRef = RefObject<HTMLAnchorElement | null>;
