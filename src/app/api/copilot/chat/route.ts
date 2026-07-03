import { NextResponse } from "next/server";

import type {
  CopilotChatMessage,
  CopilotFinancialSnapshot,
} from "@/domain/copilot";

type CopilotRequest = {
  messages?: CopilotChatMessage[];
  snapshot?: CopilotFinancialSnapshot;
};

const model = process.env.OPENAI_MODEL ?? "gpt-5.5";

function normalizedText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function shouldEnableWebSearch(messages: CopilotChatMessage[]) {
  const text = normalizedText(
    messages
      .filter((message) => message.role === "user")
      .slice(-3)
      .map((message) => message.content)
      .join(" "),
  );

  return /\b(pesquis|busc|internet|site|fonte|fontes|avaliac|review|ranking|reputacao|mensalidade|matricula|material escolar|colegio|escola|faculdade|universidade|hospital|clinica|plano de saude)\w*\b/.test(
    text,
  );
}

function compactFutureCommitments(
  snapshot: CopilotFinancialSnapshot,
  enableWebSearch: boolean,
) {
  const commitments = snapshot.context.futureCommitments;
  if (!enableWebSearch) {
    return {
      ...commitments,
      installments: commitments.installments.slice(-80),
      recurrences: commitments.recurrences.slice(-80),
      byMonth: commitments.byMonth.map((month) => ({
        ...month,
        items: month.items.slice(0, 20),
      })),
    };
  }

  return {
    range: commitments.range,
    totals: commitments.totals,
    note: commitments.note,
    byMonth: commitments.byMonth.map((month) => ({
      month: month.month,
      label: month.label,
      installmentTotal: month.installmentTotal,
      recurrenceTotal: month.recurrenceTotal,
      total: month.total,
      itemCount: month.items.length,
    })),
    installments: commitments.installments.slice(-30),
    recurrences: commitments.recurrences.slice(-30),
  };
}

function minimalMonths(
  months: CopilotFinancialSnapshot["context"]["historyMonths"],
  limit: number,
) {
  return months.slice(-limit).map((month) => ({
    month: month.month,
    income: month.income,
    expense: month.expense,
    balance: month.balance,
    availableToSpend: month.availableToSpend,
    plannedExpenses: month.plannedExpenses,
    plannedFree: month.plannedFree,
  }));
}

function compactSnapshotForWebSearch(snapshot: CopilotFinancialSnapshot) {
  const decisionSupport = snapshot.context.decisionSupport;
  const futureCommitments = snapshot.context.futureCommitments;
  const rawData = snapshot.context.rawData;

  return {
    generatedAt: snapshot.generatedAt,
    intent: snapshot.intent,
    currentMonth: snapshot.currentMonth,
    nextMonth: snapshot.nextMonth,
    financeSummary: {
      currentMonth: {
        month: snapshot.context.currentMonth.month,
        income: snapshot.context.currentMonth.income,
        expense: snapshot.context.currentMonth.expense,
        balance: snapshot.context.currentMonth.balance,
        availableToSpend: snapshot.context.currentMonth.availableToSpend,
        reserveTotal: snapshot.context.currentMonth.reserveTotal,
        netWorth: snapshot.context.currentMonth.netWorth,
      },
      nextMonth: {
        month: snapshot.context.nextMonth.month,
        plannedBudget: snapshot.context.nextMonth.plannedBudget,
        plannedExpenses: snapshot.context.nextMonth.plannedExpenses,
        plannedFree: snapshot.context.nextMonth.plannedFree,
      },
      recentMonths: minimalMonths(snapshot.context.historyMonths, 6),
      futureMonths: minimalMonths(snapshot.context.futureMonths, 6),
      decisionSupport: {
        averageMonthlyIncome: decisionSupport.averageMonthlyIncome,
        averageMonthlyExpenses: decisionSupport.averageMonthlyExpenses,
        averageMonthlyBalance: decisionSupport.averageMonthlyBalance,
        worstMonthlyBalance: decisionSupport.worstMonthlyBalance,
        averageFutureCommitments: decisionSupport.averageFutureCommitments,
        averagePlannedFree: decisionSupport.averagePlannedFree,
        conservativeMonthlyCapacity: decisionSupport.conservativeMonthlyCapacity,
        activeHistoryMonths: decisionSupport.activeHistoryMonths,
      },
      futureCommitments: {
        range: futureCommitments.range,
        totals: futureCommitments.totals,
        byMonth: futureCommitments.byMonth.slice(0, 6).map((month) => ({
          month: month.month,
          installmentTotal: month.installmentTotal,
          recurrenceTotal: month.recurrenceTotal,
          total: month.total,
        })),
      },
      topCategories: snapshot.context.topCategories.slice(0, 5),
      accountBalances: snapshot.context.accounts.slice(0, 8),
      dataCounts: rawData.counts,
    },
    note:
      "Contexto financeiro ultra compactado para pesquisa web. Use este resumo para avaliar capacidade e impacto financeiro; não há transações brutas completas neste modo.",
  };
}

export function compactSnapshotForPrompt(
  snapshot: CopilotFinancialSnapshot,
  enableWebSearch: boolean,
) {
  if (enableWebSearch) return compactSnapshotForWebSearch(snapshot);

  const rawData = snapshot.context.rawData;
  const compactRawData = {
    ...rawData,
    budgets: rawData.budgets.slice(-120),
    transactions: rawData.transactions.slice(-250),
    note:
      rawData.transactions.length > 250
        ? `${rawData.note} Enviadas somente as 250 transações mais recentes para manter a requisição dentro do limite de tokens.`
        : rawData.note,
  };

  return {
    generatedAt: snapshot.generatedAt,
    intent: snapshot.intent,
    currentMonth: snapshot.currentMonth,
    nextMonth: snapshot.nextMonth,
    summary: snapshot.summary,
    context: {
      currentMonth: snapshot.context.currentMonth,
      nextMonth: snapshot.context.nextMonth,
      historyMonths: snapshot.context.historyMonths,
      futureMonths: snapshot.context.futureMonths,
      accounts: snapshot.context.accounts,
      topCategories: snapshot.context.topCategories,
      categoryHistory: snapshot.context.categoryHistory,
      recurrences: snapshot.context.recurrences.slice(0, 60),
      futureCommitments: compactFutureCommitments(snapshot, enableWebSearch),
      decisionSupport: snapshot.context.decisionSupport,
      rawData: compactRawData,
    },
  };
}

export function buildPrompt(
  messages: CopilotChatMessage[],
  snapshot: ReturnType<typeof compactSnapshotForPrompt>,
  enableWebSearch: boolean,
) {
  const relevantMessages = enableWebSearch
    ? messages.filter((message) => message.role === "user").slice(-1)
    : messages.slice(-10);
  const history = relevantMessages
    .map(
      (message) =>
        `${message.role === "user" ? "Usuário" : "Copilot"}: ${message.content}`,
    )
    .join("\n\n");

  const baseInstructions = [
    "Você é o MoneyCopilot, um copiloto financeiro pessoal para uma família no Brasil.",
    "Responda em português brasileiro, com tom humano, direto, cuidadoso e tecnicamente preciso.",
    "Use somente os dados financeiros fornecidos no contexto para contas sobre a vida financeira do usuário.",
    "Nunca invente preços de mercado, parcelas locais, taxas, rendimento, mensalidade escolar, custo médico, valor de veículo ou qualquer cotação externa. Se esse dado não estiver na conversa ou no contexto, diga que ele falta e peça a faixa real ou monte cenários parametrizados.",
    "Para decisões de escola, saúde, moradia, investimentos, carro e compras relevantes, aja como ajudante de decisão: avalie capacidade financeira, risco, recorrência, reajustes, qualidade/valor percebido, impacto nas reservas e trade-offs. O menor preço não deve ser tratado automaticamente como melhor opção.",
    "O contexto pode ser adaptativo: use historyMonths para tendências, currentMonth para o momento atual e futureMonths/plannedExpenses para projeções e decisões futuras.",
    "Quando a pergunta envolver meses futuros, comprometimento, parcelamentos ou recorrências, use context.futureCommitments como fonte principal: totals para soma consolidada, byMonth para quebra mensal e items para detalhamento.",
    "Use context.decisionSupport para estimar capacidade de assumir uma nova obrigação mensal. Use conservativeMonthlyCapacity como teto inicial conservador, não como verdade absoluta.",
    "Use context.rawData para conferir transações, orçamentos, contas, categorias, parcelas e recorrências antes de concluir.",
    "Quando a pergunta exigir dados externos atuais e a ferramenta de busca estiver disponível, pesquise antes de responder. Cite fontes/links consultados e diferencie fatos encontrados de análise financeira.",
    "Ao comparar escolas, faculdades, clínicas, planos de saúde ou fornecedores, procure sinais de preço, taxas, proposta pedagógica/qualidade, reputação, localização, estrutura, reclamações e riscos. Se não encontrar um dado, diga explicitamente.",
    "Quando a pergunta envolver compra, compare a parcela pretendida com saldo mensal, gastos planejados futuros, reservas e variação histórica.",
    "Quando a pergunta pedir análise geral, use o histórico mensal e o histórico por categoria para apontar padrões, excessos e ações práticas.",
    "Não dê recomendação de investimento regulada nem promessa de crédito. Para compras, explique capacidade mensal, entrada sugerida, riscos e próximos passos práticos.",
    "Sempre que fizer conta, mostre a lógica em poucas linhas e separe: dados reais usados, hipóteses adotadas e dados que faltam.",
  ];

  const searchInstructions = enableWebSearch
    ? [
        "Modo pesquisa externa: faça no máximo 4 buscas web no total antes de responder.",
        "Priorize fontes oficiais das instituições, Google/avaliações públicas confiáveis, rankings ou notícias locais. Não tente esgotar a internet.",
        "Se não encontrar mensalidade ou dado financeiro, diga que não encontrou e siga com cenários usando a capacidade financeira do contexto.",
        "Depois das buscas, responda mesmo com dados parciais. Não continue pesquisando indefinidamente.",
        "Estruture a resposta em: 1) achados por escola com fontes, 2) comparação objetiva, 3) impacto financeiro, 4) perguntas que faltam responder antes da decisão.",
      ]
    : [];

  return [
    ...baseInstructions,
    ...searchInstructions,
    "",
    "Contexto financeiro consolidado:",
    JSON.stringify(snapshot, null, 2),
    "",
    "Conversa:",
    history,
  ].join("\n");
}

type JsonRecord = Record<string, unknown>;

function textFromValue(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => textFromValue(item));
  }

  const record = value as JsonRecord;
  const parts: string[] = [];
  const directText = record.text ?? record.output_text ?? record.value;
  if (typeof directText === "string" && directText.trim()) {
    parts.push(directText);
  }

  const nestedContent = record.content;
  if (Array.isArray(nestedContent)) {
    parts.push(...nestedContent.flatMap((item) => textFromValue(item)));
  }

  return parts;
}

export function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as { output_text?: unknown; output?: unknown };
  if (typeof value.output_text === "string" && value.output_text.trim()) {
    return value.output_text.trim();
  }
  if (!Array.isArray(value.output)) return null;
  const parts = value.output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as JsonRecord;
    if (record.type && record.type !== "message" && !Array.isArray(record.content)) {
      return [];
    }
    return textFromValue(record.content ?? record);
  });
  return parts.join("\n").trim() || null;
}

function responseDebugSummary(payload: unknown) {
  if (!payload || typeof payload !== "object") return "payload ausente";
  const record = payload as JsonRecord;
  const output = Array.isArray(record.output) ? record.output : [];
  const outputTypes = output
    .map((item) =>
      item && typeof item === "object" && "type" in item
        ? String((item as JsonRecord).type)
        : "unknown",
    )
    .join(", ");

  return [
    record.status ? `status=${String(record.status)}` : null,
    record.incomplete_details
      ? `incomplete=${JSON.stringify(record.incomplete_details)}`
      : null,
    outputTypes ? `output=[${outputTypes}]` : "output vazio",
  ]
    .filter(Boolean)
    .join("; ");
}

function retryDelayMs(response: Response, message: string) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, 8000);
  }

  const match = message.match(/try again in ([\d.]+)s/i);
  if (!match) return 0;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 8000) : 0;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY não está configurada no servidor. Defina a variável para habilitar o Copilot com IA.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as CopilotRequest;
  const messages =
    body.messages?.filter((message) => message.content.trim()) ?? [];
  if (!messages.length || !body.snapshot) {
    return NextResponse.json(
      { error: "Envie uma conversa e o contexto financeiro." },
      { status: 400 },
    );
  }

  const enableWebSearch = shouldEnableWebSearch(messages);
  const promptSnapshot = compactSnapshotForPrompt(body.snapshot, enableWebSearch);
  const responseBody = {
    model,
    input: buildPrompt(messages, promptSnapshot, enableWebSearch),
    max_output_tokens: enableWebSearch ? 5000 : 1200,
    reasoning: {
      effort: enableWebSearch ? "low" : "medium",
    },
    text: {
      verbosity: "medium",
    },
    ...(enableWebSearch
      ? {
          tools: [{ type: "web_search" }],
        }
      : {}),
  };

  const requestPayload = JSON.stringify(responseBody);
  const sendRequest = () =>
    fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: requestPayload,
    });

  let response = await sendRequest();
  let payload = await response.json();
  const firstErrorMessage =
    typeof payload?.error?.message === "string" ? payload.error.message : "";
  const delay = response.status === 429 ? retryDelayMs(response, firstErrorMessage) : 0;
  if (!response.ok && delay > 0) {
    await wait(delay);
    response = await sendRequest();
    payload = await response.json();
  }

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "Erro ao chamar a IA.";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  const content = outputText(payload);
  if (!content) {
    return NextResponse.json(
      {
        error: `A IA respondeu sem texto final. ${responseDebugSummary(payload)}`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ content });
}
