import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="route-message">
      <h1>Página não encontrada</h1>
      <p>O endereço informado não existe no MoneyCopilot.</p>
      <Link className="button" href="/">Voltar ao início</Link>
    </main>
  );
}
