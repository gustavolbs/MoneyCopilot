import type { Metadata } from 'next';

import { InsightsView } from './_components/InsightsView';

export const metadata: Metadata = { title: 'Insights' };

export default function InsightsPage() {
  return <InsightsView />;
}
