import type { Metadata } from 'next';

import { BudgetsView } from './_components/BudgetsView';

export const metadata: Metadata = { title: 'Orçamentos' };

export default function BudgetsPage() {
  return <BudgetsView />;
}
