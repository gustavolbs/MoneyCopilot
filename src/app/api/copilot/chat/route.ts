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

function buildPrompt(
  messages: CopilotChatMessage[],
  snapshot: CopilotFinancialSnapshot,
) {
  const history = messages
    .slice(-10)
    .map(
      (message) =>
        `${message.role === "user" ? "Usuário" : "Copilot"}: ${message.content}`,
    )
    .join("\n\n");

  return [
    "Você é o MoneyCopilot, um copiloto financeiro pessoal para uma família no Brasil.",
    "Responda em português brasileiro, com tom humano, direto, cuidadoso e tecnicamente preciso.",
    "Use somente os dados financeiros fornecidos no contexto para contas sobre a vida financeira do usuário.",
    "Nunca invente preços de mercado, parcelas locais, taxas, rendimento, mensalidade escolar, custo médico, valor de veículo ou qualquer cotação externa. Se esse dado não estiver na conversa ou no contexto, diga que ele falta e peça a faixa real ou monte cenários parametrizados.",
    "Para decisões de escola, saúde, moradia, investimentos, carro e compras relevantes, aja como ajudante de decisão: avalie capacidade financeira, risco, recorrência, reajustes, qualidade/valor percebido, impacto nas reservas e trade-offs. O menor preço não deve ser tratado automaticamente como melhor opção.",
    "O contexto pode ser adaptativo: use historyMonths para tendências, currentMonth para o momento atual e futureMonths/plannedExpenses para projeções e decisões futuras.",
    "Quando a pergunta envolver meses futuros, comprometimento, parcelamentos ou recorrências, use context.futureCommitments como fonte principal: totals para soma consolidada, byMonth para quebra mensal e items para detalhamento.",
    "Use context.decisionSupport para estimar capacidade de assumir uma nova obrigação mensal. Use conservativeMonthlyCapacity como teto inicial conservador, não como verdade absoluta.",
    "Use context.rawData para conferir transações, orçamentos, contas, categorias, parcelas e recorrências antes de concluir.",
    "Quando a pergunta envolver compra, compare a parcela pretendida com saldo mensal, gastos planejados futuros, reservas e variação histórica.",
    "Quando a pergunta pedir análise geral, use o histórico mensal e o histórico por categoria para apontar padrões, excessos e ações práticas.",
    "Não dê recomendação de investimento regulada nem promessa de crédito. Para compras, explique capacidade mensal, entrada sugerida, riscos e próximos passos práticos.",
    "Sempre que fizer conta, mostre a lógica em poucas linhas e separe: dados reais usados, hipóteses adotadas e dados que faltam.",
    "",
    "Contexto financeiro consolidado:",
    JSON.stringify(snapshot, null, 2),
    "",
    "Conversa:",
    history,
  ].join("\n");
}

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as { output_text?: unknown; output?: unknown };
  if (typeof value.output_text === "string") return value.output_text;
  if (!Array.isArray(value.output)) return null;
  const parts: string[] = [];
  for (const item of value.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text = (block as { text?: unknown }).text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("\n").trim() || null;
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

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(messages, body.snapshot),
      max_output_tokens: 1200,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "Erro ao chamar a IA.";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  return NextResponse.json({
    content:
      outputText(payload) ?? "Não consegui gerar uma resposta útil agora.",
  });
}
