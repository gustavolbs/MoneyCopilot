import type { Metadata } from "next";

import { CopilotView } from "./_components/CopilotView";

export const metadata: Metadata = { title: "Copilot" };

export default function CopilotPage() {
  return <CopilotView />;
}
