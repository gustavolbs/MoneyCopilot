'use client';

import { ChartNoAxesCombined, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { BrandLogo } from '@/components/BrandLogo';
import { Button, Screen } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { friendlyAuthError } from '@/lib/authErrors';
import { isSupabaseConfigured } from '@/lib/env';
import { useAppStore } from '@/store/appStore';

type AuthMode = 'login' | 'signup';
type Feedback = { tone: 'error' | 'success'; message: string } | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInView() {
  const router = useRouter();
  const { signIn, signUp, ensureHousehold, refresh, loading } = useAppStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword('');
    setFeedback(null);
  };

  const validate = () => {
    if (mode === 'signup' && fullName.trim().length < 2) return 'Informe seu nome.';
    if (!emailPattern.test(email.trim())) return 'Informe um e-mail válido.';
    if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
    return null;
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (loading) return;
    const validationError = validate();
    if (validationError) {
      setFeedback({ tone: 'error', message: validationError });
      return;
    }

    setFeedback(null);
    try {
      if (mode === 'signup') {
        const submittedEmail = email.trim();
        const result = await signUp(submittedEmail, password, fullName.trim());
        if (result.requiresEmailConfirmation) {
          setFullName('');
          setEmail('');
          setPassword('');
          setShowPassword(false);
          setFeedback({ tone: 'success', message: `Conta criada. Enviamos um link de confirmação para ${submittedEmail}.` });
          return;
        }
      } else {
        await signIn(email.trim(), password);
      }
      router.replace('/');
      router.refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: friendlyAuthError(error) });
    }
  };

  const localMode = async () => {
    try {
      await ensureHousehold('Família');
      await refresh();
      router.replace('/');
    } catch (error) {
      setFeedback({ tone: 'error', message: friendlyAuthError(error) });
    }
  };

  return (
    <Screen>
      <div className="auth-shell">
        <section className="auth-brand-panel" aria-label="MoneyCopilot">
          <BrandLogo size={48} tagline="Seu dinheiro, com direção." className="auth-brand" />
          <div className="auth-pitch">
            <span className="auth-eyebrow">Finanças sem ruído</span>
            <h1>Decisões melhores começam com uma visão clara.</h1>
            <p>Organize contas, acompanhe gastos e planeje o futuro da sua família em um só lugar.</p>
          </div>
          <div className="auth-benefits">
            <div><span><ChartNoAxesCombined size={18} /></span><p><strong>Visão completa</strong><small>Receitas, despesas e patrimônio organizados.</small></p></div>
            <div><span><WalletCards size={18} /></span><p><strong>Controle compartilhado</strong><small>Dados financeiros da família sempre alinhados.</small></p></div>
            <div><span><ShieldCheck size={18} /></span><p><strong>Dados protegidos</strong><small>Acesso privado e sincronização segura.</small></p></div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-heading">
            <span className="auth-mobile-lock"><LockKeyhole size={18} /></span>
            <h2>{mode === 'signup' ? 'Crie sua conta' : 'Boas-vindas de volta'}</h2>
            <p>{mode === 'signup' ? 'Comece a organizar sua vida financeira.' : 'Entre para acessar seu painel financeiro.'}</p>
          </div>

          <Tabs value={mode} onValueChange={(value) => changeMode(value as AuthMode)} className="contents">
            <TabsList className="auth-mode-switch" aria-label="Tipo de acesso">
              <TabsTrigger value="login" className={mode === 'login' ? 'active' : ''}>Entrar</TabsTrigger>
              <TabsTrigger value="signup" className={mode === 'signup' ? 'active' : ''}>Criar conta</TabsTrigger>
            </TabsList>
          </Tabs>

          <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
            {mode === 'signup' ? (
              <div className="auth-field-group">
                <Label htmlFor="auth-name">Nome</Label>
                <Input id="auth-name" name="name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.currentTarget.value)} placeholder="Como podemos chamar você?" disabled={loading} />
              </div>
            ) : null}
            <div className="auth-field-group">
              <Label htmlFor="auth-email">E-mail</Label>
              <Input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="voce@exemplo.com" disabled={loading} />
            </div>
            <div className="auth-field-group">
              <Label htmlFor="auth-password">Senha</Label>
              <InputGroup className="auth-password-field">
                <InputGroupInput id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Mínimo de 6 caracteres" disabled={loading} />
                <InputGroupButton size="icon-sm" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</InputGroupButton>
              </InputGroup>
            </div>

            {feedback ? <Alert className={`auth-feedback ${feedback.tone}`} variant={feedback.tone === 'error' ? 'destructive' : 'default'} role={feedback.tone === 'error' ? 'alert' : 'status'} aria-live={feedback.tone === 'success' ? 'polite' : 'assertive'}>{feedback.tone === 'success' ? <Check size={17} /> : null}<AlertDescription>{feedback.message}</AlertDescription></Alert> : null}

            <ShadcnButton className="button auth-submit" type="submit" disabled={loading}>
              {loading ? <Spinner /> : mode === 'signup' ? 'Criar minha conta' : 'Entrar no MoneyCopilot'}
            </ShadcnButton>
          </form>

          <p className="auth-alternate">
            {mode === 'signup' ? 'Já possui uma conta?' : 'Ainda não possui uma conta?'}{' '}
            <ShadcnButton type="button" variant="link" onClick={() => changeMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Entrar' : 'Criar conta'}</ShadcnButton>
          </p>

          {!isSupabaseConfigured() ? (
            <div className="auth-local-mode">
              <span>Supabase não configurado. Use o modo local para testar.</span>
              <Button onPress={() => void localMode()} variant="ghost">Entrar em modo local</Button>
            </div>
          ) : null}
        </section>
      </div>
    </Screen>
  );
}
