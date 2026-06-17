import { CSSProperties, FormEvent, ReactNode } from 'react';

import { useTheme } from '@/lib/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors, isDark } = useTheme();
  return (
    <main
      className={`screen${scroll ? ' scroll' : ''}`}
      style={{
        backgroundColor: colors.bg,
        backgroundImage: isDark
          ? 'radial-gradient(circle at 50% 0%, rgba(47, 128, 255, 0.22), transparent 30rem), linear-gradient(180deg, #00101F 0%, #000813 56%, #000611 100%)'
          : 'linear-gradient(180deg, #FFFFFF 0%, #F6F8FC 64%)',
      }}
    >
      {children}
    </main>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { colors, isDark } = useTheme();
  return (
    <section
      className="card"
      style={{
        backgroundColor: colors.surface,
        backgroundImage: isDark ? 'linear-gradient(180deg, rgba(94, 167, 255, 0.08), rgba(0, 13, 28, 0.08))' : undefined,
        borderColor: colors.line,
        boxShadow: isDark
          ? '0 18px 45px rgba(0, 6, 17, 0.46), inset 0 1px 0 rgba(94, 167, 255, 0.08)'
          : '0 12px 26px rgba(19, 36, 58, 0.06)',
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { colors } = useTheme();
  return <h1 className="title" style={{ color: colors.ink, ...style }}>{children}</h1>;
}

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { colors } = useTheme();
  return <div className="label" style={{ color: colors.muted, ...style }}>{children}</div>;
}

export function Button({ children, onPress, variant = 'primary', loading = false }: { children: ReactNode; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; loading?: boolean }) {
  const { colors } = useTheme();
  const foreground = variant === 'ghost' ? colors.ink : variant === 'primary' ? colors.bg : '#fff';
  return (
    <button
      type="button"
      onClick={onPress}
      className={`button ${variant}`}
      disabled={loading}
      style={{
        backgroundColor: variant === 'ghost' ? 'transparent' : variant === 'danger' ? colors.red : colors.ink,
        borderColor: variant === 'ghost' ? colors.line : 'transparent',
        color: foreground,
      }}
    >
      {loading ? <span className="small-spinner" /> : children}
    </button>
  );
}

export function Field(props: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  onSubmitEditing?: () => void;
}) {
  const { colors } = useTheme();
  const common = {
    value: props.value,
    placeholder: props.placeholder,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => props.onChangeText(event.currentTarget.value),
    className: `field${props.multiline ? ' multiline' : ''}`,
    style: { backgroundColor: colors.elevated, borderColor: colors.line, color: colors.ink } as CSSProperties,
  };
  const submit = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !props.multiline && props.onSubmitEditing) props.onSubmitEditing();
  };

  if (props.multiline) return <textarea {...common} rows={4} />;

  return (
    <input
      {...common}
      type={props.secureTextEntry ? 'password' : props.keyboardType === 'email-address' ? 'email' : props.keyboardType === 'numeric' ? 'text' : 'text'}
      inputMode={props.keyboardType === 'numeric' ? 'decimal' : props.keyboardType === 'email-address' ? 'email' : undefined}
      onKeyDown={submit}
    />
  );
}

export function RowItem({ title, subtitle, right, onPress }: { title: string; subtitle?: string; right?: ReactNode; onPress?: () => void }) {
  const { colors } = useTheme();
  const Content = (
    <>
      <div className="row-main">
        <div className="row-title" style={{ color: colors.ink }}>{title}</div>
        {subtitle ? <div className="row-subtitle" style={{ color: colors.muted }}>{subtitle}</div> : null}
      </div>
      {right}
    </>
  );
  return onPress ? <button type="button" onClick={onPress} className="row-item as-button">{Content}</button> : <div className="row-item">{Content}</div>;
}

export function InlineForm({ children, onSubmit }: { children: ReactNode; onSubmit: () => void }) {
  return (
    <form
      className="inline-form"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}
