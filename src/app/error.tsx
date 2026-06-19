'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="route-message">
      <h1>Não foi possível abrir esta página</h1>
      <p>Tente novamente. Seus dados locais não foram removidos.</p>
      <Button type="button" onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
