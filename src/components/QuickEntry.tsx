import { SendHorizonal } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { formatCurrency } from '@/domain/normalize';
import { parseTransactionInput } from '@/domain/parser';
import { useTheme } from '@/lib/theme';
import { useAppStore } from '@/store/appStore';

export function QuickEntry() {
  const [value, setValue] = useState('');
  const { colors, isDark } = useTheme();
  const { addQuickInput, categories, rules, accounts } = useAppStore();
  const preview = useMemo(() => (value.trim() ? parseTransactionInput(value, { categories, rules, accounts }) : []), [accounts, categories, rules, value]);

  const submit = async () => {
    if (!value.trim()) return;
    await addQuickInput(value);
    setValue('');
  };

  return (
    <div className="quick-entry">
      <div className="quick-input-row" style={{ backgroundColor: colors.surface, borderColor: colors.line }}>
        <textarea
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          placeholder="Adicionar lançamento..."
          className="quick-input"
          style={{ color: colors.ink }}
          rows={2}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void submit();
          }}
        />
        <button
          type="button"
          onClick={() => void submit()}
          className="icon-button send"
          style={{ backgroundColor: isDark ? colors.blue : colors.ink }}
          aria-label="Enviar lançamento"
        >
          <SendHorizonal color={isDark ? '#00111F' : colors.bg} size={20} />
        </button>
      </div>
      {preview.length > 0 ? (
        <div className="preview" style={{ backgroundColor: colors.surface, borderColor: colors.line }}>
          {preview.slice(0, 4).map((item) => (
            <div key={item.raw} className="preview-row" style={{ borderBottomColor: colors.line }}>
              <div className="preview-title" style={{ color: colors.ink }}>{item.description}</div>
              <div className="preview-amount" style={{ color: item.type === 'income' ? colors.green : item.type === 'transfer' ? colors.blue : colors.red }}>
                {item.type === 'income' ? '+' : item.type === 'transfer' ? '' : '-'}{formatCurrency(item.amount)}
              </div>
              <div className="preview-cat" style={{ color: colors.muted }}>
                <CategoryBadge
                  category={categories.find((category) => category.id === item.category_id)}
                  label={item.type === 'transfer' ? `Transferência${item.transfer_account_name_hint ? ` para ${item.transfer_account_name_hint}` : ''}` : item.category_name}
                  compact
                />
                <span>{Math.round(item.confidence * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
