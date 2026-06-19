import type { Metadata } from 'next';

import { ReservesView } from './_components/ReservesView';

export const metadata: Metadata = { title: 'Cofrinhos' };

export default function ReservesPage() {
  return <ReservesView />;
}
