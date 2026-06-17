'use client';

import { useEffect, useState } from 'react';

import { SyncPill } from '@/components/SyncPill';
import { Button, Card, Field, Label, RowItem, Screen, Title } from '@/components/ui';
import { Account } from '@/domain/types';
import { isSupabaseConfigured } from '@/lib/env';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function SettingsScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const { colors } = useTheme();
  const { household, accounts, categories, rules, recurrences, syncLogs, resetCache, signOut, sync, addAccount, familyMembers, familyInvites, loadFamily, inviteMember, removeMember } = useAppStore();
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<Account['type']>('reserve');
  const [inviteEmail, setInviteEmail] = useState('');
  const [familyError, setFamilyError] = useState<string | null>(null);
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
          <RowItem key={account.id} title={account.name} subtitle={account.type === 'reserve' ? 'Cofrinho/Reserva' : account.type} />
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
        <Button
          onPress={() => {
            void addAccount(accountName, accountType);
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
