'use client';

import { Button } from '@/components/ui/button';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="route-message">
          <h1>Não foi possível iniciar o MoneyCopilot</h1>
          <p>Recarregue a aplicação para tentar restaurar a sessão.</p>
          <Button type="button" onClick={reset}>Tentar novamente</Button>
        </main>
      </body>
    </html>
  );
}
