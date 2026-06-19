import { defaultCategories, keywordCategoryMap } from './categories';
import { normalizeText, todayISODate } from './normalize';
import { Category, CategorizationRule, ParsedTransaction, TransactionType, UserRules } from './types';

const incomeWords = ['salario', 'recebi', 'recebido', 'rendimento', 'inquilina', 'pix recebido', 'reembolso'];
const fixedWords = ['aluguel', 'internet', 'assinatura', 'escola', 'academia', 'condominio', 'salario'];
const transferWords = ['transferencia', 'transferir', 'guardar', 'mover', 'resgatar', 'ted', 'doc', 'pix para mim', 'entre contas'];

const amountRegex = /(?:^|\s)([+-]?\s*(?:r\$|rs)?\s*\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|[+-]?\s*(?:r\$|rs)?\s*\d+(?:,\d{1,2})?)(?:\s*(?:reais|real))?(?=\s|$)/i;

function parseMoney(value: string): number {
  const cleaned = value
    .toLowerCase()
    .replace(/r\$|rs|reais|real|\s/g, '')
    .replace(/^\+/, '')
    .replace(/^-/, '');
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/\.(?=\d{3}(?:\D|$))/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function applyRules(normalized: string, type: TransactionType, rules: CategorizationRule[]) {
  const sorted = rules
    .filter((rule) => !rule.deleted_at)
    .sort((a, b) => b.priority - a.priority);

  return sorted.find((rule) => {
    if (rule.type && rule.type !== type) return false;
    const pattern = normalizeText(rule.pattern);
    if (rule.match_type === 'exact') return normalized === pattern;
    if (rule.match_type === 'regex') {
      try {
        return new RegExp(rule.pattern, 'i').test(normalized);
      } catch {
        return false;
      }
    }
    return normalized.includes(pattern);
  });
}

function suggestCategory(normalized: string, type: TransactionType, categories: Category[], rules: CategorizationRule[]) {
  if (type === 'transfer') {
    return {
      category: categories.find((item) => item.id === 'cat_expense_other') ?? categories[0],
      confidence: 0.9,
    };
  }
  const rule = applyRules(normalized, type, rules);
  if (rule?.category_id) {
    const category = categories.find((item) => item.id === rule.category_id);
    if (category) return { category, confidence: 0.96 };
  }

  const keyword = keywordCategoryMap.find((item) => {
    if (item.type && item.type !== type) return false;
    const padded = ` ${normalized} `;
    return item.keywords.some((word) => padded.includes(` ${normalizeText(word)} `));
  });

  if (keyword) {
    const category = categories.find((item) => item.id === keyword.categoryId);
    if (category) return { category, confidence: 0.82 };
  }

  const fallbackId = type === 'income' ? 'cat_income_other' : 'cat_expense_other';
  return {
    category: categories.find((item) => item.id === fallbackId) ?? categories[0],
    confidence: 0.45,
  };
}

export function parseTransactionInput(input: string, context: UserRules): ParsedTransaction[] {
  const categories = context.categories.length ? context.categories : defaultCategories;
  const rules = context.rules ?? [];
  const today = todayISODate(context.today ?? new Date());

  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((raw) => {
      const amountMatch = raw.match(amountRegex);
      const amountToken = amountMatch?.[1] ?? '0';
      const amount = parseMoney(amountToken);
      const hasPlus = /\+\s*(?:r\$|rs)?\s*\d/i.test(raw);
      const hasMinus = /-\s*(?:r\$|rs)?\s*\d/i.test(raw);
      const description = raw
        .replace(amountRegex, ' ')
        .replace(/\s+-\s+|\s+\+\s+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const normalized = normalizeText(description || raw);
      const probableIncome = incomeWords.some((word) => normalized.includes(normalizeText(word)));
      const probableTransfer = transferWords.some((word) => normalized.includes(normalizeText(word))) || /\b(?:para|no|na|do|da)\s+(?:cofrinho|reserva)\b/.test(normalized);
      const type: TransactionType = probableTransfer ? 'transfer' : hasPlus || (!hasMinus && probableIncome) ? 'income' : 'expense';
      const categoryResult = suggestCategory(normalized, type, categories, rules);
      const accountHints = detectTransferAccountHints(description, context.accounts ?? [], normalized);
      const recurrence_hint = fixedWords.some((word) => normalized.includes(normalizeText(word))) ? 'probable_monthly' : 'none';
      const movement_kind =
        type === 'income'
          ? 'income'
          : type === 'transfer'
            ? 'transfer'
            : recurrence_hint === 'probable_monthly'
              ? 'fixed_expense'
              : normalized.includes('cartao') || normalized.includes('fatura')
                ? 'payment'
                : 'variable_expense';

      return {
        raw,
        description: description || raw,
        normalized_description: normalized,
        amount,
        type,
        category_id: categoryResult.category?.id ?? null,
        category_name: categoryResult.category?.name ?? 'Outros',
        account_id: accountHints.sourceAccountId,
        transfer_account_id: accountHints.destinationAccountId,
        account_name_hint: accountHints.sourceName,
        transfer_account_name_hint: accountHints.destinationName,
        transaction_date: today,
        recurrence_hint,
        movement_kind,
        confidence: amount > 0 ? categoryResult.confidence : 0.2,
      };
    });
}

function detectTransferAccountHints(description: string, accounts: NonNullable<UserRules['accounts']>, normalized: string) {
  const normalizedAccounts = accounts.map((account) => ({ account, normalizedName: normalizeText(account.name) }));
  const findMentioned = (text: string) => normalizedAccounts.find((item) => text.includes(item.normalizedName))?.account ?? null;
  const sourceText = normalized.match(/\b(?:do|da|de)\s+(.+?)\s+para\b/)?.[1] ?? normalized.match(/\bresgatar\b.*\b(?:do|da|de)\s+(.+)$/)?.[1] ?? '';
  const destinationText = normalized.match(/\b(?:para|no|na)\s+(.+)$/)?.[1] ?? '';
  const sourceAccount = findMentioned(sourceText) ?? null;
  const destinationAccount = findMentioned(destinationText) ?? findMentioned(normalized);

  const rawDestination =
    description.match(/\b(?:para|no|na)\s+(.+)$/i)?.[1]?.trim() ??
    (normalized.startsWith('resgatar') ? null : normalized.includes('cofrinho') || normalized.includes('reserva') ? description.trim() : null);
  const rawSource = description.match(/\b(?:do|da|de)\s+(.+?)\s+para\b/i)?.[1]?.trim() ?? description.match(/\bresgatar\b.*\b(?:do|da|de)\s+(.+)$/i)?.[1]?.trim() ?? null;

  return {
    sourceAccountId: sourceAccount?.id ?? null,
    destinationAccountId: destinationAccount?.id ?? null,
    sourceName: rawSource,
    destinationName: rawDestination,
  };
}
