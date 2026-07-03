import { ChartNoAxesCombined, ShieldCheck, WalletCards } from 'lucide-react';

import { BrandLogo } from '@/components/BrandLogo';

const benefits = [
  {
    icon: ChartNoAxesCombined,
    title: 'Visão completa',
    description: 'Receitas, despesas e patrimônio organizados.',
  },
  {
    icon: WalletCards,
    title: 'Controle compartilhado',
    description: 'Dados financeiros da família sempre alinhados.',
  },
  {
    icon: ShieldCheck,
    title: 'Dados protegidos',
    description: 'Acesso privado e sincronização segura.',
  },
];

export function AuthBrandPanel() {
  return (
    <section className="auth-brand-panel" aria-label="MoneyCopilot">
      <BrandLogo size={48} tagline="Seu dinheiro, com direção." className="auth-brand" />

      <div className="auth-pitch">
        <span className="auth-eyebrow">Finanças sem ruído</span>
        <h1>Decisões melhores começam com uma visão clara.</h1>
        <p>Organize contas, acompanhe gastos e planeje o futuro da sua família em um só lugar.</p>
      </div>

      <div className="auth-benefits">
        {benefits.map(({ icon: Icon, title, description }) => (
          <div key={title}>
            <span>
              <Icon size={18} />
            </span>
            <p>
              <strong>{title}</strong>
              <small>{description}</small>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
