import { Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button, Card, Field, Label, Screen, Title } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export default function SignInScreen() {
  const router = useRouter();
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
      router.replace('/(tabs)' as Href);
    } catch (error) {
      Alert.alert('Autenticacao', error instanceof Error ? error.message : 'Erro ao autenticar');
    }
  };

  const localMode = async () => {
    await ensureHousehold('Familia');
    await refresh();
    router.replace('/(tabs)' as Href);
  };

  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 24 }}>
        <Label>MoneyCopilot privado</Label>
        <Title>{mode === 'signup' ? 'Criar acesso' : 'Entrar'}</Title>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Login por e-mail/senha via Supabase Auth. Todos os dados ficam ligados ao household.
        </Text>
      </View>
      <Card style={{ gap: 12 }}>
        {mode === 'signup' ? <Field value={fullName} onChangeText={setFullName} placeholder="Nome" /> : null}
        <Field value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" />
        <Field value={password} onChangeText={setPassword} placeholder="Senha" secureTextEntry />
        <Button onPress={submit} loading={loading}>{mode === 'signup' ? 'Criar conta' : 'Entrar'}</Button>
        <Button onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')} variant="ghost">
          {mode === 'signup' ? 'Ja tenho conta' : 'Criar nova conta'}
        </Button>
      </Card>
      {!isSupabaseConfigured() ? (
        <Card style={{ gap: 10 }}>
          <Label>Supabase nao configurado</Label>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>Use modo local para testar o app. Depois preencha `.env` para auth e sync remoto.</Text>
          <Button onPress={localMode} variant="ghost">Entrar em modo local</Button>
        </Card>
      ) : null}
    </Screen>
  );
}
