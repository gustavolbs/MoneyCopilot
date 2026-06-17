import { Alert, Pressable, Text, View } from 'react-native';
import { useState } from 'react';

import { SyncPill } from '@/components/SyncPill';
import { Button, Card, Field, Label, RowItem, Screen, Title } from '@/components/ui';
import { Account } from '@/domain/types';
import { isSupabaseConfigured } from '@/lib/env';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { household, accounts, categories, rules, recurrences, syncLogs, resetCache, signOut, sync, addAccount } = useAppStore();
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<Account['type']>('reserve');
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
      <View style={{ gap: 8 }}>
        <SyncPill />
        <Label>Organizacao do app</Label>
        <Title>Ajustes</Title>
      </View>

      <Card style={{ gap: 10 }}>
        <Label>Familia</Label>
        <RowItem title={household?.name ?? 'Familia'} subtitle="Dados compartilhados no household" />
        <RowItem title="Membros" subtitle="Convites por e-mail preparados no Supabase" right={<Text style={{ color: colors.muted }}>Em breve</Text>} />
      </Card>

      <Card style={{ gap: 8 }}>
        <Label>Contas</Label>
        {accounts.map((account) => (
          <RowItem key={account.id} title={account.name} subtitle={account.type === 'reserve' ? 'Cofrinho/Reserva' : account.type} />
        ))}
        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 8 }} />
        <Field value={accountName} onChangeText={setAccountName} placeholder="Ex: Cofrinho Casa" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {accountTypes.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setAccountType(item.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: accountType === item.value ? colors.ink : colors.subtle,
              }}
            >
              <Text style={{ color: accountType === item.value ? colors.bg : colors.ink, fontWeight: '500', fontSize: 13 }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
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
          <Text key={`${log.created_at}-${log.message}`} style={{ color: colors.muted, fontSize: 12 }}>{log.created_at.slice(11, 19)} · {log.message}</Text>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Label>Manutencao</Label>
        <Button onPress={() => Alert.alert('Reset local', 'Apagar cache SQLite local?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Resetar', style: 'destructive', onPress: () => void resetCache() }])} variant="danger">
          Reset local cache
        </Button>
        <Button onPress={() => void signOut()} variant="ghost">Sair</Button>
      </Card>
    </Screen>
  );
}
