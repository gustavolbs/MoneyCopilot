import type { Metadata } from "next";

import { DashboardView } from "../_components/DashboardView";

export const metadata: Metadata = { title: "Início" };

export default function DashboardPage() {
  return <DashboardView />;
}
