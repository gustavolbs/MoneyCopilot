import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AuthMode = 'login' | 'signup';

export function AuthModeSwitch({
  value,
  onChange,
}: {
  value: AuthMode;
  onChange: (value: AuthMode) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(nextValue) => onChange(nextValue as AuthMode)} className="auth-mode-tabs">
      <TabsList className="auth-mode-switch" aria-label="Tipo de acesso">
        <TabsTrigger value="login" className={value === 'login' ? 'auth-mode-trigger active' : 'auth-mode-trigger'}>
          Entrar
        </TabsTrigger>
        <TabsTrigger value="signup" className={value === 'signup' ? 'auth-mode-trigger active' : 'auth-mode-trigger'}>
          Criar conta
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
