'use client';

import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SyncPill } from '@/components/SyncPill';
import { Button, Card, Field, Label, RowItem, Screen, Title } from '@/components/ui';
import { Account } from '@/domain/types';
import { isSupabaseConfigured } from '@/lib/env';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function SettingsScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const { colors } = useTheme();
  const { household, accounts, categories, rules, recurrences, syncLogs, resetCache, signOut, sync, addAccount, editAccount, familyMembers, familyInvites, loadFamily, inviteMember, removeMember } = useAppStore();
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<Account['type']>('reserve');
  const [cardDueDay, setCardDueDay] = useState('10');
  const [cardBestPurchaseDay, setCardBestPurchaseDay] = useState('3');
  const [inviteEmail, setInviteEmail] = useState('');
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const isOwner = familyMembers.some((member) => member.isYou && member.role === 'owner');

  useEffect(() => {
    if (isSupabaseConfigured() && household) void loadFamily();
  }, [household, loadFamily]);

  const handleInvite = async () => {
    setFamilyError(null);
    try {
      await inviteMember(inviteEmail);
      setInviteEmail('');
    } catch (error) {
      setFamilyError(error instanceof Error ? error.message : 'Nao foi possivel convidar.');
    }
  };
  const accountTypes: Array<{ label: string; value: Account['type'] }> = [
    { label: 'Conta corrente', value: 'checking' },
    { label: 'Cartao de credito', value: 'credit_card' },
    { label: 'Dinheiro', value: 'cash' },
    { label: 'Cofrinho/Reserva', value: 'reserve' },
    { label: 'Investimento', value: 'investment' },
    { label: 'Outros', value: 'other' },
  ];

  return (
    <Screen>
      <div className="stack small">
        <SyncPill />
        <Label>Organizacao do app</Label>
        <Title>Ajustes</Title>
      </div>

      <Card style={{ gap: 10 }}>
        <Label>Familia</Label>
        <RowItem title={household?.name ?? 'Familia'} subtitle="Dados compartilhados no household" />

        {familyMembers.map((member) => (
          <RowItem
            key={member.user_id}
            title={member.isYou ? `${member.name} (voce)` : member.name}
            subtitle={member.role === 'owner' ? 'Responsavel' : 'Membro'}
            right={
              isOwner && !member.isYou ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Remover ${member.name} da familia?`)) void removeMember(member.user_id);
                  }}
                  className="chip"
                  style={{ backgroundColor: colors.subtle, color: colors.red, borderColor: 'transparent' }}
                >
                  Remover
                </button>
              ) : undefined
            }
          />
        ))}

        {familyInvites.map((invite) => (
          <RowItem key={invite.id} title={invite.email} subtitle="Convite pendente" right={<span style={{ color: colors.muted }}>Aguardando</span>} />
        ))}

        {!isSupabaseConfigured() ? (
          <p className="sync-log" style={{ color: colors.muted }}>Configure o Supabase para convidar membros.</p>
        ) : isOwner ? (
          <>
            <div className="separator" style={{ backgroundColor: colors.line }} />
            <Label>Convidar por e-mail</Label>
            <Field value={inviteEmail} onChangeText={setInviteEmail} placeholder="email@exemplo.com" keyboardType="email-address" />
            <Button onPress={() => void handleInvite()} variant="ghost">Enviar convite</Button>
            {familyError ? <p className="sync-log" style={{ color: colors.red }}>{familyError}</p> : null}
            <p className="sync-log" style={{ color: colors.muted }}>A pessoa entra na familia ao criar conta ou logar com esse e-mail.</p>
          </>
        ) : (
          <p className="sync-log" style={{ color: colors.muted }}>Apenas o responsavel pode convidar novos membros.</p>
        )}
      </Card>

      <Card style={{ gap: 8 }}>
        <Label>Contas</Label>
        {accounts.map((account) => (
          <div key={account.id} className="settings-account-item" style={{ borderColor: colors.line }}>
            <RowItem
              title={account.name}
              subtitle={
                account.type === 'reserve'
                  ? 'Cofrinho/Reserva'
                  : account.type === 'credit_card'
                    ? `Cartao · vence dia ${account.credit_card_due_day ?? '-'} · melhor compra dia ${account.credit_card_best_purchase_day ?? '-'}`
                    : account.type
              }
              right={
                <button type="button" className="account-edit-button" onClick={() => setEditingAccountId(editingAccountId === account.id ? null : account.id)} style={{ color: colors.blue, backgroundColor: colors.subtle }}>
                  <Pencil size={14} />
                  Editar
                </button>
              }
            />
            {editingAccountId === account.id ? (
              <AccountEditor
                account={account}
                accountTypes={accountTypes}
                onCancel={() => setEditingAccountId(null)}
                onSave={async (patch) => {
                  await editAccount(account, patch);
                  setEditingAccountId(null);
                }}
              />
            ) : null}
          </div>
        ))}
        <div className="separator" style={{ backgroundColor: colors.line }} />
        <Field value={accountName} onChangeText={setAccountName} placeholder="Ex: Cofrinho Casa" />
        <div className="chip-grid">
          {accountTypes.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => setAccountType(item.value)}
              className="chip"
              style={{ backgroundColor: accountType === item.value ? colors.ink : colors.subtle, color: accountType === item.value ? colors.bg : colors.ink, borderColor: 'transparent' }}
            >
              {item.label}
            </button>
          ))}
        </div>
        {accountType === 'credit_card' ? (
          <div className="card-date-grid">
            <div>
              <Label>Dia de vencimento</Label>
              <Field value={cardDueDay} onChangeText={setCardDueDay} placeholder="10" keyboardType="numeric" />
            </div>
            <div>
              <Label>Melhor dia de compra</Label>
              <Field value={cardBestPurchaseDay} onChangeText={setCardBestPurchaseDay} placeholder="3" keyboardType="numeric" />
            </div>
          </div>
        ) : null}
        <Button
          onPress={() => {
            const dueDay = clampDay(cardDueDay, 10);
            const bestPurchaseDay = clampDay(cardBestPurchaseDay, 3);
            void addAccount(accountName, accountType, accountType === 'credit_card' ? { dueDay, bestPurchaseDay } : undefined);
            setAccountName('');
          }}
          variant="ghost"
        >
          Adicionar conta
        </Button>
      </Card>

      <Card style={{ gap: 8 }}>
        <Label>Automacoes</Label>
        <RowItem title="Categorias" subtitle={`${categories.length} categorias cadastradas`} />
        <RowItem title="Regras automaticas" subtitle={`${rules.length} regras aprendidas por correcao`} />
        <RowItem title="Recorrencias" subtitle={recurrences.length ? `${recurrences.length} recorrencias ativas` : 'Nenhuma recorrencia cadastrada'} />
      </Card>

      <Card style={{ gap: 10 }}>
        <Label>Sincronizacao</Label>
        <RowItem title="Supabase" subtitle={isSupabaseConfigured() ? 'Configurado' : 'Nao configurado'} />
        <Button onPress={() => void sync()} variant="ghost">Sincronizar agora</Button>
        {syncLogs.slice(0, 5).map((log) => (
          <p key={`${log.created_at}-${log.message}`} className="sync-log" style={{ color: colors.muted }}>{log.created_at.slice(11, 19)} · {log.message}</p>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Label>Manutencao</Label>
        <Button
          onPress={() => {
            if (window.confirm('Apagar cache local?')) void resetCache();
          }}
          variant="danger"
        >
          Reset local cache
        </Button>
        <Button
          onPress={() => {
            void signOut().then(onSignedOut);
          }}
          variant="ghost"
        >
          Sair
        </Button>
      </Card>
    </Screen>
  );
}

function clampDay(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31 ? parsed : fallback;
}

function AccountEditor({ account, accountTypes, onSave, onCancel }: {
  account: Account;
  accountTypes: Array<{ label: string; value: Account['type'] }>;
  onSave: (patch: Partial<Pick<Account, 'name' | 'type' | 'initial_balance' | 'credit_card_due_day' | 'credit_card_best_purchase_day'>>) => Promise<void>;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState(account.name);
  const [type, setType] = useState(account.type);
  const [initialBalance, setInitialBalance] = useState(String(account.initial_balance).replace('.', ','));
  const [dueDay, setDueDay] = useState(String(account.credit_card_due_day ?? 10));
  const [bestPurchaseDay, setBestPurchaseDay] = useState(String(account.credit_card_best_purchase_day ?? 3));

  useEffect(() => {
    setName(account.name);
    setType(account.type);
    setInitialBalance(String(account.initial_balance).replace('.', ','));
    setDueDay(String(account.credit_card_due_day ?? 10));
    setBestPurchaseDay(String(account.credit_card_best_purchase_day ?? 3));
  }, [account]);

  const save = () => {
    const balance = Number(initialBalance.replace(/\./g, '').replace(',', '.'));
    if (!name.trim() || !Number.isFinite(balance)) {
      window.alert('Informe nome e saldo inicial validos.');
      return;
    }
    void onSave({
      name: name.trim(),
      type,
      initial_balance: balance,
      credit_card_due_day: type === 'credit_card' ? clampDay(dueDay, 10) : null,
      credit_card_best_purchase_day: type === 'credit_card' ? clampDay(bestPurchaseDay, 3) : null,
    });
  };

  return (
    <div className="account-editor" style={{ backgroundColor: colors.subtle }}>
      <div className="account-editor-fields">
        <div><Label>Nome</Label><Field value={name} onChangeText={setName} placeholder="Nome da conta" /></div>
        <div><Label>Saldo inicial</Label><Field value={initialBalance} onChangeText={setInitialBalance} placeholder="0,00" keyboardType="numeric" /></div>
      </div>
      <div className="account-type-picker">
        {accountTypes.map((item) => (
          <button
            type="button"
            key={item.value}
            className="chip"
            onClick={() => setType(item.value)}
            style={{ backgroundColor: type === item.value ? colors.ink : colors.surface, color: type === item.value ? colors.bg : colors.ink, borderColor: colors.line }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {type === 'credit_card' ? (
        <div className="account-editor-fields">
          <div><Label>Dia de vencimento</Label><Field value={dueDay} onChangeText={setDueDay} placeholder="10" keyboardType="numeric" /></div>
          <div><Label>Melhor dia de compra</Label><Field value={bestPurchaseDay} onChangeText={setBestPurchaseDay} placeholder="3" keyboardType="numeric" /></div>
        </div>
      ) : null}
      <div className="account-editor-actions">
        <Button onPress={onCancel} variant="ghost">Cancelar</Button>
        <Button onPress={save}>Salvar alteracoes</Button>
      </div>
    </div>
  );
}
