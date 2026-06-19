import type { Metadata } from 'next';

import { TransactionsView } from './_components/TransactionsView';

export const metadata: Metadata = { title: 'Transações' };

export default function TransactionsPage() {
  return <TransactionsView />;
}
