# MoneyCopilot

App pessoal de gestao financeira para iPhone com Expo, React Native, TypeScript, Supabase e SQLite offline-first.

## Stack e decisao tecnica

- Expo SDK 54, React Native 0.81, TypeScript strict e Expo Router.
- UI com NativeWind instalado/configurado, mais componentes próprios com `StyleSheet` para manter controle fino da experiencia premium no MVP.
- Supabase Auth + Postgres + RLS para household compartilhado.
- Offline-first com Expo SQLite + fila local de mutacoes.

Escolha de sync: **C) Expo SQLite + camada custom**. Para um app privado e manual, essa opcao tem menor complexidade operacional que WatermelonDB e evita acoplamento a sincronizadores mais opinativos. O modelo usa `updated_at`, `deleted_at`, `mutation_queue`, last-write-wins para updates simples e soft delete vencendo update antigo no servidor.

## Setup local

Requisitos:

- Node recomendado: `20.19.x` para Expo SDK 54. A maquina atual esta em `20.19.3`; React Native/Metro 0.81 exigem pelo menos `20.19.4`.
- iPhone com Expo Go ou build interna via EAS.

Instale:

```bash
npm install
cp .env.example .env
```

Configure `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
EXPO_PUBLIC_ENABLE_AI=false
```

Rode:

```bash
npm run ios
# ou
npm run start
```

Sem Supabase configurado, a tela de login oferece modo local para testar o fluxo offline.

## Supabase

1. Crie um projeto Supabase.
2. Rode a migration em `supabase/migrations/0001_initial_schema.sql`.
3. Confirme que RLS está habilitado nas tabelas.
4. Use apenas a anon key no app. Nunca exponha service role key.

O schema inclui:

- `profiles`
- `households`
- `household_members`
- `household_invites`
- `accounts`
- `categories`
- `transactions`
- `categorization_rules`
- `budgets`
- `recurrences`
- `sync_metadata`

## Rodar no iPhone

Expo Go:

```bash
npm run start
```

Leia o QR code no iPhone. Para SQLite/Supabase/Auth este fluxo é suficiente no MVP.

Build interna/TestFlight:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile preview
```

Depois distribua por link interno ou TestFlight conforme a conta Apple.

## Scripts

```bash
npm test
npm run typecheck
npm run lint
npm run format
```

## Fluxo implementado

- Auth por e-mail/senha via Supabase, com modo local quando `.env` não existe.
- Criação local de household no primeiro acesso.
- Seed de contas padrão.
- Contas do tipo conta corrente, cartao de credito, dinheiro, cofrinho/reserva, investimento e outros.
- Transferencias internas entre contas, incluindo “Guardar 5000 no Cofrinho Casa”, sem afetar receitas/despesas.
- Categorias padrão locais e no Supabase.
- Lançamento rápido por texto livre e múltiplas linhas.
- Parser determinístico com `+` para receita, vírgula decimal brasileira, ponto de milhar, moeda e palavras de receita.
- Categorização por regras locais, histórico corrigido e keywords.
- Correção de categoria cria regra automática offline e sincronizável.
- SQLite local com soft delete e fila de mutações.
- Sync manual/automático quando online.
- Dashboard mensal com receitas, despesas, sobra prevista, categorias e transações recentes.
- Dashboard com saldo disponivel para gastar, total guardado em cofrinhos/reservas e patrimonio financeiro total.
- Transações com busca e edição simples de categoria.
- Orçamentos por categoria com barra e alerta visual em 80%/100%.
- Recorrências cadastráveis a partir de transação no domínio/store.
- Insights determinísticos sem IA.
- Feature flag de IA criada, desligada por padrão.
- Testes unitários para parser e cálculos.

## Próximos hardenings recomendados

- Tela dedicada para aceitar convites por e-mail.
- Bottom sheet completo para editar prévia antes de salvar; hoje a prévia aparece antes do envio e a edição ocorre na lista de transações.
- Exportação CSV com `expo-file-system` + `expo-sharing`.
- Resolução visual de conflitos de sync quando dois aparelhos editarem o mesmo campo no mesmo intervalo.
- Testes instrumentados em iOS e screenshots com Browser/Expo web se a versão web for priorizada.
