# MoneyCopilot

PWA pessoal de gestao financeira com Next.js 16, React, TypeScript, Supabase e cache local offline-first no browser.

## Stack

- Next.js 16 App Router, React 19 e TypeScript strict.
- PWA instalavel com manifest, icone maskable e layout responsivo para mobile/desktop.
- Supabase Auth + Postgres + RLS para household compartilhado.
- Cache local no browser com fila de mutacoes e sync manual/automatico quando online.
- Dominio financeiro e parser deterministico preservados em `src/domain`.

## Setup local

Requisitos:

- Node 20.9+.

Instale:

```bash
npm install
cp .env.example .env.local
```

Configure `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
NEXT_PUBLIC_ENABLE_AI=false
```

Rode:

```bash
npm run dev
```

Sem Supabase configurado, a tela de login oferece modo local para testar o fluxo offline.

## Supabase

1. Crie um projeto Supabase.
2. Rode as migrations em `supabase/migrations`.
3. Confirme que RLS está habilitado nas tabelas.
4. Use apenas a anon key no app. Nunca exponha service role key.

## Scripts

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Fluxo implementado

- Auth por e-mail/senha via Supabase, com modo local quando `.env.local` não existe.
- Criação local de household no primeiro acesso.
- Seed de contas padrão.
- Contas do tipo conta corrente, cartao de credito, dinheiro, cofrinho/reserva, investimento e outros.
- Transferencias internas entre contas, incluindo "Guardar 5000 no Cofrinho Casa", sem afetar receitas/despesas.
- Categorias padrão locais e no Supabase.
- Lançamento rápido por texto livre e múltiplas linhas.
- Parser determinístico com `+` para receita, vírgula decimal brasileira, ponto de milhar, moeda e palavras de receita.
- Categorização por regras locais, histórico corrigido e keywords.
- Correção de categoria cria regra automática offline e sincronizável.
- Sync manual/automático quando online.
- Dashboard mensal com receitas, despesas, sobra prevista, categorias e transações recentes.
- Dashboard com saldo disponivel para gastar, total guardado em cofrinhos/reservas e patrimonio financeiro total.
- Transações com busca e edição simples.
- Orçamentos por categoria com barra e alerta visual em 80%/100%.
- Recorrências cadastráveis a partir de transação no domínio/store.
- Insights determinísticos sem IA.
- Feature flag de IA criada, desligada por padrão.
- Testes unitários para parser e cálculos.

## Próximos hardenings recomendados

- Service worker dedicado para cache de shell e assets versionados.
- Tela dedicada para aceitar convites por e-mail.
- Exportação CSV no browser.
- Resolução visual de conflitos de sync quando dois aparelhos editarem o mesmo campo no mesmo intervalo.
- Testes E2E com screenshots para o PWA.
