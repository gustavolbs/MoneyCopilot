'use client';

import {
  Building2,
  Cloud,
  CreditCard,
  Database,
  LogOut,
  Pencil,
  PiggyBank,
  Plus,
  Repeat2,
  Tags,
  Trash2,
  UserPlus,
  Users,
  WalletCards,
  WandSparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { SyncPill } from '@/components/SyncPill';
import { Button, Card, Field, Label, RowItem, Screen, Title } from '@/components/ui';
import { formatDateTime } from '@/domain/normalize';
import { Account } from '@/domain/types';
import { isSupabaseConfigured } from '@/lib/env';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

type Manager = 'family' | 'accounts' | null;

export function SettingsScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const { colors } = useTheme();
  const {
    household,
    accounts,
    categories,
    rules,
    recurrences,
    syncStatus,
    syncLogs,
    resetCache,
    signOut,
    sync,
    addAccount,
    editAccount,
    deleteAccount,
    familyMembers,
    familyInvites,
    loadFamily,
    inviteMember,
    removeMember,
  } = useAppStore();
  const [manager, setManager] = useState<Manager>(null);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<Account['type']>('reserve');
  const [cardDueDay, setCardDueDay] = useState('10');
  const [cardBestPurchaseDay, setCardBestPurchaseDay] = useState('3');
  const [inviteEmail, setInviteEmail] = useState('');
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ tone: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const isOwner = familyMembers.some((member) => member.isYou && member.role === 'owner');
  const cardCount = accounts.filter((account) => account.type === 'credit_card').length;
  const reserveCount = accounts.filter((account) => account.type === 'reserve').length;
  const automationCount = rules.length + recurrences.length;

  useEffect(() => {
    if (isSupabaseConfigured() && household) void loadFamily();
  }, [household, loadFamily]);

  useEffect(() => {
    if (!manager) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setManager(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [manager]);

  const handleInvite = async () => {
    setFamilyError(null);
    try {
      await inviteMember(inviteEmail);
      setInviteEmail('');
    } catch (error) {
      setFamilyError(error instanceof Error ? error.message : 'Não foi possível convidar.');
    }
  };

  const handleSync = async () => {
    if (syncStatus === 'syncing') return;
    setSyncFeedback(null);
    const result = await sync();
    setSyncFeedback(
      result === 'idle'
        ? { tone: 'success', message: 'Sincronização concluída.' }
        : result === 'offline'
          ? { tone: 'warning', message: 'Sem conexão. A sincronização ficou pendente.' }
          : { tone: 'error', message: 'Não foi possível sincronizar agora.' },
    );
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!window.confirm(`Excluir a conta "${account.name}"? As transações já registradas serão preservadas.`)) return;
    setDeletingAccountId(account.id);
    try {
      await deleteAccount(account);
      if (editingAccountId === account.id) setEditingAccountId(null);
    } finally {
      setDeletingAccountId(null);
    }
  };

  const accountTypes: Array<{ label: string; value: Account['type'] }> = [
    { label: 'Conta corrente', value: 'checking' },
    { label: 'Cartão de crédito', value: 'credit_card' },
    { label: 'Dinheiro', value: 'cash' },
    { label: 'Cofrinho/Reserva', value: 'reserve' },
    { label: 'Investimento', value: 'investment' },
    { label: 'Outros', value: 'other' },
  ];

  return (
    <Screen>
      <div className="settings-page-header">
        <div><Label>Organização do app</Label><Title>Ajustes</Title></div>
        <SyncPill />
      </div>

      <div className="settings-overview-grid">
        <SettingsStat icon={<Users size={17} />} value={familyMembers.length} label="membros" color={colors.blue} />
        <SettingsStat icon={<WalletCards size={17} />} value={accounts.length} label="contas" color={colors.green} />
        <SettingsStat icon={<WandSparkles size={17} />} value={automationCount} label="automações" color={colors.gold} />
        <SettingsStat icon={<Cloud size={17} />} value={syncLogs.length} label="eventos de sync" color={isSupabaseConfigured() ? colors.green : colors.gold} />
      </div>

      <div className="settings-layout-grid">
        <Card style={{ gap: 12, padding: 14 }}>
          <SettingsCardHeader
            icon={<Users size={18} />}
            title="Família"
            detail={household?.name ?? 'Dados compartilhados'}
            color={colors.blue}
            action="Gerenciar"
            onAction={() => setManager('family')}
          />
          <div className="settings-family-preview">
            <div className="settings-avatar-stack" aria-label={`${familyMembers.length} membros`}>
              {familyMembers.slice(0, 4).map((member, index) => (
                <span key={member.user_id} style={{ zIndex: 4 - index, backgroundColor: member.isYou ? colors.blue : colors.subtle, color: member.isYou ? '#00111F' : colors.ink }}>
                  {member.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
              ))}
              {!familyMembers.length ? <span style={{ backgroundColor: colors.subtle, color: colors.muted }}><Users size={15} /></span> : null}
            </div>
            <div className="settings-preview-copy">
              <strong>{familyMembers.length} membro(s)</strong>
              <small style={{ color: colors.muted }}>{familyInvites.length ? `${familyInvites.length} convite(s) pendente(s)` : 'Nenhum convite pendente'}</small>
            </div>
            {isOwner && isSupabaseConfigured() ? <button type="button" className="settings-icon-action" onClick={() => setManager('family')} style={{ color: colors.blue, backgroundColor: colors.subtle }} aria-label="Convidar membro"><UserPlus size={17} /></button> : null}
          </div>
        </Card>

        <Card style={{ gap: 12, padding: 14 }}>
          <SettingsCardHeader
            icon={<WalletCards size={18} />}
            title="Patrimônio e pagamentos"
            detail="Contas, cartões e reservas"
            color={colors.green}
            action="Gerenciar"
            onAction={() => setManager('accounts')}
          />
          <div className="settings-mini-metrics">
            <MiniMetric icon={<Building2 size={16} />} value={accounts.length} label="Contas" />
            <MiniMetric icon={<CreditCard size={16} />} value={cardCount} label="Cartões" />
            <MiniMetric icon={<PiggyBank size={16} />} value={reserveCount} label="Reservas" />
          </div>
        </Card>

        <Card style={{ gap: 12, padding: 14 }}>
          <SettingsCardHeader icon={<WandSparkles size={18} />} title="Automações" detail="Classificação e previsões" color={colors.gold} />
          <div className="settings-automation-grid">
            <AutomationItem icon={<Tags size={17} />} title="Categorias" value={categories.length} detail="disponíveis" color={colors.blue} />
            <AutomationItem icon={<WandSparkles size={17} />} title="Regras" value={rules.length} detail="aprendidas" color={colors.gold} />
            <AutomationItem icon={<Repeat2 size={17} />} title="Recorrências" value={recurrences.length} detail="ativas" color={colors.green} />
          </div>
        </Card>

        <Card style={{ gap: 12, padding: 14 }}>
          <SettingsCardHeader
            icon={<Cloud size={18} />}
            title="Dados e sincronização"
            detail={syncStatus === 'syncing' ? 'Sincronizando dados...' : isSupabaseConfigured() ? 'Nuvem configurada' : 'Somente neste dispositivo'}
            color={isSupabaseConfigured() ? colors.green : colors.gold}
            action="Sincronizar"
            actionLoading={syncStatus === 'syncing'}
            onAction={() => void handleSync()}
          />
          <div className="settings-sync-preview" role="status" aria-live="polite">
            <span className="settings-status-pill" style={{ backgroundColor: `${syncStatus === 'error' ? colors.red : syncStatus === 'offline' ? colors.gold : colors.green}18`, color: syncStatus === 'error' ? colors.red : syncStatus === 'offline' ? colors.gold : colors.green }}>
              {syncStatus === 'syncing' ? 'Sincronizando' : syncStatus === 'error' ? 'Erro' : syncStatus === 'offline' ? 'Offline' : isSupabaseConfigured() ? 'Nuvem ativa' : 'Modo local'}
            </span>
            <small style={{ color: syncFeedback?.tone === 'error' ? colors.red : syncFeedback?.tone === 'warning' ? colors.gold : syncFeedback?.tone === 'success' ? colors.green : colors.muted }}>
              {syncFeedback?.message ?? (syncLogs[0] ? `${formatDateTime(syncLogs[0].created_at)} · ${syncLogs[0].message}` : 'Nenhuma sincronização registrada.')}
            </small>
          </div>
        </Card>

        <Card style={{ gap: 12, padding: 14 }}>
          <SettingsCardHeader icon={<Database size={18} />} title="Manutenção" detail="Dados locais e acesso" color={colors.red} />
          <div className="settings-maintenance-actions">
            <Button onPress={() => { if (window.confirm('Apagar cache local?')) void resetCache(); }} variant="danger"><Database size={15} /> Limpar cache</Button>
            <Button onPress={() => void signOut().then(onSignedOut)} variant="ghost"><LogOut size={15} /> Sair</Button>
          </div>
        </Card>
      </div>

      {manager === 'family' ? (
        <SettingsManagerModal title="Gerenciar família" subtitle={`${familyMembers.length} membro(s) · ${familyInvites.length} convite(s)`} onClose={() => setManager(null)}>
          <div className="settings-manager-list">
            <RowItem title={household?.name ?? 'Família'} subtitle="Ambiente financeiro compartilhado" />
            {familyMembers.map((member) => (
              <RowItem
                key={member.user_id}
                title={member.isYou ? `${member.name} (você)` : member.name}
                subtitle={member.role === 'owner' ? 'Responsável' : 'Membro'}
                right={isOwner && !member.isYou ? (
                  <button type="button" className="settings-row-danger" onClick={() => { if (window.confirm(`Remover ${member.name} da família?`)) void removeMember(member.user_id); }} style={{ color: colors.red, backgroundColor: colors.subtle }}>Remover</button>
                ) : undefined}
              />
            ))}
            {familyInvites.map((invite) => <RowItem key={invite.id} title={invite.email} subtitle="Convite pendente" right={<span className="settings-pending-label" style={{ color: colors.gold }}>Aguardando</span>} />)}
          </div>
          <div className="settings-manager-form" style={{ backgroundColor: colors.subtle }}>
            {!isSupabaseConfigured() ? <p style={{ color: colors.muted }}>Configure o Supabase para convidar membros.</p> : isOwner ? (
              <>
                <div><Label>Convidar por e-mail</Label><small style={{ color: colors.muted }}>A pessoa entra na família usando este endereço.</small></div>
                <div className="settings-invite-row"><Field value={inviteEmail} onChangeText={setInviteEmail} placeholder="email@exemplo.com" keyboardType="email-address" /><Button onPress={() => void handleInvite()} variant="ghost">Convidar</Button></div>
                {familyError ? <p style={{ color: colors.red }}>{familyError}</p> : null}
              </>
            ) : <p style={{ color: colors.muted }}>Apenas o responsável pode convidar novos membros.</p>}
          </div>
        </SettingsManagerModal>
      ) : null}

      {manager === 'accounts' ? (
        <SettingsManagerModal title="Gerenciar contas" subtitle={`${accounts.length} conta(s) · ${cardCount} cartão(ões)`} onClose={() => setManager(null)}>
          <div className="settings-manager-toolbar">
            <span style={{ color: colors.muted }}>Edite saldos, tipos e vencimentos.</span>
            <button type="button" className="settings-add-button" onClick={() => setShowAccountForm((visible) => !visible)} style={{ color: colors.blue, backgroundColor: colors.subtle }}><Plus size={15} /> Nova conta</button>
          </div>
          {showAccountForm ? (
            <div className="settings-create-account" style={{ backgroundColor: colors.subtle }}>
              <div className="settings-create-title"><Plus size={16} color={colors.blue} /><strong>Adicionar conta</strong></div>
              <Field value={accountName} onChangeText={setAccountName} placeholder="Ex: Cofrinho Casa" />
              <div className="chip-grid">{accountTypes.map((item) => <button type="button" key={item.value} onClick={() => setAccountType(item.value)} className="chip" style={{ backgroundColor: accountType === item.value ? colors.ink : colors.surface, color: accountType === item.value ? colors.bg : colors.ink, borderColor: colors.line }}>{item.label}</button>)}</div>
              {accountType === 'credit_card' ? <div className="card-date-grid"><div><Label>Dia de vencimento</Label><Field value={cardDueDay} onChangeText={setCardDueDay} placeholder="10" keyboardType="numeric" /></div><div><Label>Melhor dia de compra</Label><Field value={cardBestPurchaseDay} onChangeText={setCardBestPurchaseDay} placeholder="3" keyboardType="numeric" /></div></div> : null}
              <Button onPress={() => {
                const dueDay = clampDay(cardDueDay, 10);
                const bestPurchaseDay = clampDay(cardBestPurchaseDay, 3);
                void addAccount(accountName, accountType, accountType === 'credit_card' ? { dueDay, bestPurchaseDay } : undefined).then(() => { setAccountName(''); setShowAccountForm(false); });
              }}>Adicionar conta</Button>
            </div>
          ) : null}
          <div className="settings-manager-list">
            {accounts.map((account) => (
              <div key={account.id} className="settings-account-item" style={{ borderColor: colors.line }}>
                <RowItem
                  title={account.name}
                  subtitle={account.type === 'reserve' ? 'Cofrinho/Reserva' : account.type === 'credit_card' ? `Cartão · vence dia ${account.credit_card_due_day ?? '-'} · melhor compra dia ${account.credit_card_best_purchase_day ?? '-'}` : account.type}
                  right={<div className="settings-account-actions"><button type="button" className="account-edit-button" onClick={() => setEditingAccountId(editingAccountId === account.id ? null : account.id)} style={{ color: colors.blue, backgroundColor: colors.subtle }}><Pencil size={14} /> Editar</button><button type="button" className="account-delete-button" onClick={() => void handleDeleteAccount(account)} disabled={deletingAccountId === account.id} style={{ color: colors.red, backgroundColor: colors.subtle }} aria-label={`Excluir conta ${account.name}`}>{deletingAccountId === account.id ? <span className="small-spinner" /> : <Trash2 size={14} />} Excluir</button></div>}
                />
                {editingAccountId === account.id ? <AccountEditor account={account} accountTypes={accountTypes} onCancel={() => setEditingAccountId(null)} onSave={async (patch) => { await editAccount(account, patch); setEditingAccountId(null); }} /> : null}
              </div>
            ))}
          </div>
        </SettingsManagerModal>
      ) : null}
    </Screen>
  );
}

function SettingsStat({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return <div className="settings-stat" style={{ borderColor: `${color}35` }}><span style={{ color, backgroundColor: `${color}18` }}>{icon}</span><strong>{value}</strong><small>{label}</small></div>;
}

function SettingsCardHeader({ icon, title, detail, color, action, actionLoading = false, onAction }: { icon: React.ReactNode; title: string; detail: string; color: string; action?: string; actionLoading?: boolean; onAction?: () => void }) {
  return (
    <div className="settings-section-heading">
      <span style={{ color, backgroundColor: `${color}18` }}>{icon}</span>
      <div><strong>{title}</strong><small>{detail}</small></div>
      {action && onAction ? <button type="button" className="settings-card-action" onClick={onAction} disabled={actionLoading} style={{ color, backgroundColor: `${color}12` }}>{actionLoading ? <span className="small-spinner" /> : action}</button> : null}
    </div>
  );
}

function MiniMetric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return <div><span>{icon}</span><p><strong>{value}</strong><small>{label}</small></p></div>;
}

function AutomationItem({ icon, title, value, detail, color }: { icon: React.ReactNode; title: string; value: number; detail: string; color: string }) {
  return <div className="settings-automation-item"><span style={{ color, backgroundColor: `${color}18` }}>{icon}</span><div><strong>{title}</strong><small>{detail}</small></div><b style={{ color }}>{value}</b></div>;
}

function SettingsManagerModal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-manager-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="settings-manager-modal" style={{ backgroundColor: colors.bg, borderColor: colors.line }} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><h2 id="settings-manager-title">{title}</h2><p style={{ color: colors.muted }}>{subtitle}</p></div><button type="button" className="icon-button" onClick={onClose} style={{ backgroundColor: colors.subtle }} aria-label="Fechar"><X size={19} /></button></header>
        <div className="settings-manager-content">{children}</div>
      </section>
    </div>
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
      window.alert('Informe nome e saldo inicial válidos.');
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
      <div className="account-editor-fields"><div><Label>Nome</Label><Field value={name} onChangeText={setName} placeholder="Nome da conta" /></div><div><Label>Saldo inicial</Label><Field value={initialBalance} onChangeText={setInitialBalance} placeholder="0,00" keyboardType="numeric" /></div></div>
      <div className="account-type-picker">{accountTypes.map((item) => <button type="button" key={item.value} className="chip" onClick={() => setType(item.value)} style={{ backgroundColor: type === item.value ? colors.ink : colors.surface, color: type === item.value ? colors.bg : colors.ink, borderColor: colors.line }}>{item.label}</button>)}</div>
      {type === 'credit_card' ? <div className="account-editor-fields"><div><Label>Dia de vencimento</Label><Field value={dueDay} onChangeText={setDueDay} placeholder="10" keyboardType="numeric" /></div><div><Label>Melhor dia de compra</Label><Field value={bestPurchaseDay} onChangeText={setBestPurchaseDay} placeholder="3" keyboardType="numeric" /></div></div> : null}
      <div className="account-editor-actions"><Button onPress={onCancel} variant="ghost">Cancelar</Button><Button onPress={save}>Salvar alterações</Button></div>
    </div>
  );
}
