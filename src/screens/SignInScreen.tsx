'use client';

import { ChartNoAxesCombined, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { BrandLogo } from '@/components/BrandLogo';
import { Button, Screen } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { useAppStore } from '@/store/appStore';

type AuthMode = 'login' | 'signup';
type Feedback = { tone: 'error' | 'success'; message: string } | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Não foi possível autenticar.';
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/user already registered/i.test(message)) return 'Este e-mail já possui uma conta.';
  if (/password should be at least/i.test(message)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit/i.test(message)) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  return message;
}

export function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
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
        const result = await signUp(email.trim(), password, fullName.trim());
        if (result.requiresEmailConfirmation) {
          setPassword('');
          setFeedback({ tone: 'success', message: `Enviamos um link de confirmação para ${email.trim()}.` });
          return;
        }
      } else {
        await signIn(email.trim(), password);
      }
      onSignedIn();
    } catch (error) {
      setFeedback({ tone: 'error', message: friendlyAuthError(error) });
    }
  };

  const localMode = async () => {
    try {
      await ensureHousehold('Família');
      await refresh();
      onSignedIn();
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

          <div className="auth-mode-switch" role="tablist" aria-label="Tipo de acesso">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Entrar</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => changeMode('signup')}>Criar conta</button>
          </div>

          <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
            {mode === 'signup' ? (
              <label className="auth-field-group" htmlFor="auth-name">
                <span>Nome</span>
                <input id="auth-name" name="name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.currentTarget.value)} placeholder="Como podemos chamar você?" disabled={loading} />
              </label>
            ) : null}
            <label className="auth-field-group" htmlFor="auth-email">
              <span>E-mail</span>
              <input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="voce@exemplo.com" disabled={loading} />
            </label>
            <div className="auth-field-group">
              <label htmlFor="auth-password">Senha</label>
              <div className="auth-password-field">
                <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Mínimo de 6 caracteres" disabled={loading} />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>

            {feedback ? <div className={`auth-feedback ${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.tone === 'success' ? <Check size={17} /> : null}<span>{feedback.message}</span></div> : null}

            <button className="button auth-submit" type="submit" disabled={loading}>
              {loading ? <span className="small-spinner" /> : mode === 'signup' ? 'Criar minha conta' : 'Entrar no MoneyCopilot'}
            </button>
          </form>

          <p className="auth-alternate">
            {mode === 'signup' ? 'Já possui uma conta?' : 'Ainda não possui uma conta?'}{' '}
            <button type="button" onClick={() => changeMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Entrar' : 'Criar conta'}</button>
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
