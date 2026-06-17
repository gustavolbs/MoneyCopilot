'use client';

import { useState } from 'react';

import { Button, Card, Field, Label, Screen, Title } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const { colors } = useTheme();
  const { signIn, signUp, ensureHousehold, refresh, loading } = useAppStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const submit = async () => {
    try {
      if (mode === 'signup') await signUp(email.trim(), password, fullName.trim());
      else await signIn(email.trim(), password);
      onSignedIn();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Erro ao autenticar');
    }
  };

  const localMode = async () => {
    await ensureHousehold('Familia');
    await refresh();
    onSignedIn();
  };

  return (
    <Screen>
      <div className="stack small auth-head">
        <Label>MoneyCopilot privado</Label>
        <Title>{mode === 'signup' ? 'Criar acesso' : 'Entrar'}</Title>
        <p className="muted" style={{ color: colors.muted }}>Login por e-mail/senha via Supabase Auth. Todos os dados ficam ligados ao household.</p>
      </div>
      <Card style={{ gap: 12 }}>
        {mode === 'signup' ? <Field value={fullName} onChangeText={setFullName} placeholder="Nome" /> : null}
        <Field value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" />
        <Field value={password} onChangeText={setPassword} placeholder="Senha" secureTextEntry onSubmitEditing={() => void submit()} />
        <Button onPress={() => void submit()} loading={loading}>{mode === 'signup' ? 'Criar conta' : 'Entrar'}</Button>
        <Button onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')} variant="ghost">
          {mode === 'signup' ? 'Ja tenho conta' : 'Criar nova conta'}
        </Button>
      </Card>
      {!isSupabaseConfigured() ? (
        <Card style={{ gap: 10 }}>
          <Label>Supabase nao configurado</Label>
          <p className="muted" style={{ color: colors.muted }}>Use modo local para testar o app. Depois preencha `.env.local` para auth e sync remoto.</p>
          <Button onPress={() => void localMode()} variant="ghost">Entrar em modo local</Button>
        </Card>
      ) : null}
    </Screen>
  );
}
