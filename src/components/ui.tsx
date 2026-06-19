import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown } from 'lucide-react';
import { CSSProperties, ReactNode } from 'react';

import { Button as ShadcnButton } from '@/components/ui/button';
import { Card as ShadcnCard } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label as ShadcnLabel } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/lib/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { colors, isDark } = useTheme();
  return (
    <main
      className={`screen${scroll ? ' scroll' : ''}`}
      style={{
        backgroundColor: colors.bg,
        backgroundImage: isDark
          ? 'linear-gradient(#0D1117, #0D1117)'
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
    <ShadcnCard
      className="card"
      style={{
        backgroundColor: colors.surface,
        backgroundImage: isDark ? 'linear-gradient(180deg, rgba(53, 130, 255, 0.025), transparent)' : undefined,
        borderColor: colors.line,
        boxShadow: isDark
          ? 'none'
          : '0 12px 26px rgba(19, 36, 58, 0.06)',
        ...style,
      }}
    >
      {children}
    </ShadcnCard>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { colors } = useTheme();
  return <h1 className="title" style={{ color: colors.ink, ...style }}>{children}</h1>;
}

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { colors } = useTheme();
  return <ShadcnLabel className="label" style={{ color: colors.muted, ...style }}>{children}</ShadcnLabel>;
}

export function Button({ children, onPress, variant = 'primary', loading = false }: { children: ReactNode; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; loading?: boolean }) {
  const { colors } = useTheme();
  const foreground = variant === 'ghost' ? colors.ink : variant === 'primary' ? colors.bg : '#fff';
  return (
    <ShadcnButton
      type="button"
      onClick={onPress}
      variant={variant === 'danger' ? 'destructive' : variant === 'ghost' ? 'outline' : 'default'}
      className={`button ${variant}`}
      disabled={loading}
      style={{
        backgroundColor: variant === 'ghost' ? 'transparent' : variant === 'danger' ? colors.red : colors.ink,
        borderColor: variant === 'ghost' ? colors.line : 'transparent',
        color: foreground,
      }}
    >
      {loading ? <Spinner /> : children}
    </ShadcnButton>
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

  if (props.multiline) return <Textarea {...common} rows={4} />;

  return (
    <Input
      {...common}
      type={props.secureTextEntry ? 'password' : props.keyboardType === 'email-address' ? 'email' : props.keyboardType === 'numeric' ? 'text' : 'text'}
      inputMode={props.keyboardType === 'numeric' ? 'decimal' : props.keyboardType === 'email-address' ? 'email' : undefined}
      onKeyDown={submit}
    />
  );
}

export function SelectField({ value, onValueChange, options, disabled = false, className, placeholder }: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? '')} disabled={disabled}>
      <SelectTrigger className={`field ${className ?? ''}`} style={{ backgroundColor: colors.elevated, borderColor: colors.line, color: colors.ink }}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

type ComboboxOption = { value: string; label: string };

export function ComboboxField({ value, onValueChange, options, disabled = false, className, placeholder }: {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const { colors, isDark } = useTheme();
  const selected = options.find((option) => option.value === value) ?? null;
  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={(item: ComboboxOption | null) => onValueChange(item?.value ?? '')}
      disabled={disabled}
    >
      <Combobox.InputGroup
        className={`combobox-field ${className ?? ''}`}
        style={{ backgroundColor: colors.elevated, border: `1px solid ${colors.line}` }}
      >
        <Combobox.Input
          className="combobox-input"
          placeholder={placeholder}
          disabled={disabled}
          style={{ color: colors.ink }}
        />
        <Combobox.Trigger className="combobox-trigger" aria-label="Abrir lista" style={{ color: colors.muted }}>
          <ChevronDown size={16} />
        </Combobox.Trigger>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner className="combobox-positioner" sideOffset={6}>
          <Combobox.Popup
            className="combobox-popup"
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.line}`,
              color: colors.ink,
              boxShadow: isDark
                ? '0 18px 44px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06)'
                : '0 18px 40px rgba(19, 36, 58, 0.16)',
            }}
          >
            <Combobox.Empty className="combobox-empty" style={{ color: colors.muted }}>
              Nenhuma opção encontrada.
            </Combobox.Empty>
            <Combobox.List className="combobox-list">
              {(item: ComboboxOption) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="combobox-item"
                  style={{ color: colors.ink }}
                >
                  <span className="combobox-item-indicator" style={{ color: colors.blue }}>
                    <Combobox.ItemIndicator>
                      <Check size={15} />
                    </Combobox.ItemIndicator>
                  </span>
                  <span className="combobox-item-label">{item.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
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
  return onPress ? <ShadcnButton type="button" variant="ghost" onClick={onPress} className="row-item as-button">{Content}</ShadcnButton> : <div className="row-item">{Content}</div>;
}
