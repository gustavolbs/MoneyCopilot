"use client";

import { Bot, Car, MessageSquarePlus, RotateCcw, Send, ShoppingBag, Trash2, TrendingDown, X } from "lucide-react";
import { useEffect, useMemo } from "react";

import { Button, Field, Label, Screen, Title } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/button";
import { buildCopilotFinancialSnapshot } from "@/domain/copilot";
import { useAppStore } from "@/store/appStore";
import { chatNeedsAssistantResponse, useCopilotStore } from "@/store/copilotStore";

import { MarkdownMessage } from "./markdown-message";

const suggestions = [
  {
    icon: Car,
    text: "Quero comprar um carro de R$ 80 mil. Quanto posso arcar na parcela e qual entrada faria sentido?",
  },
  {
    icon: ShoppingBag,
    text: "Quero comprar uma TV ou celular. Quando é o melhor momento para fazer essa compra?",
  },
  {
    icon: TrendingDown,
    text: "Analise minhas finanças e me ajude a ver onde estou gastando muito e o que fazer para melhorar.",
  },
];

export function CopilotView() {
  const { accounts, budgets, categories, recurrences, transactions } = useAppStore();
  const {
    activeChatId,
    chats,
    clearChat,
    deleteChat,
    error,
    hydrate,
    input,
    loading,
    retryFromMessage,
    selectChat,
    sendMessage,
    setInput,
    startChat,
  } = useCopilotStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? chats[0] ?? null;
  const needsAssistantResponse = chatNeedsAssistantResponse(activeChat);
  const financialContext = useMemo(
    () => ({ accounts, budgets, categories, recurrences, transactions }),
    [accounts, budgets, categories, recurrences, transactions],
  );
  const snapshot = useMemo(
    () =>
      buildCopilotFinancialSnapshot({
        ...financialContext,
        messages: activeChat?.messages ?? [],
      }),
    [activeChat?.messages, financialContext],
  );

  return (
    <Screen className="copilot-screen">
      <div className="copilot-page-header">
        <div>
          <Label>IA financeira</Label>
          <Title>Copilot</Title>
          <p>
            Converse por objetivo: compra de carro, troca de celular, redução de gastos ou planejamento do próximo mês.
          </p>
        </div>
        <Button onPress={() => startChat()} variant="ghost">
          <MessageSquarePlus size={16} /> Nova conversa
        </Button>
      </div>

      <div className="copilot-layout">
        <aside className="copilot-sidebar" data-swipe-ignore>
          <div className="copilot-sidebar-heading">
            <strong>Conversas</strong>
            <span>{chats.length}</span>
          </div>
          <div className="copilot-chat-list">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="copilot-chat-tab"
                data-active={chat.id === activeChat?.id}
              >
                <button type="button" onClick={() => selectChat(chat.id)}>
                  <strong>{chat.title}</strong>
                  <small>{chat.messages.length} mensagens</small>
                </button>
                <ShadcnButton
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="copilot-chat-delete"
                  aria-label={`Excluir conversa ${chat.title}`}
                  onClick={() => deleteChat(chat.id)}
                >
                  <X size={13} />
                </ShadcnButton>
              </div>
            ))}
          </div>
        </aside>

        <section className="copilot-panel">
          <div className="copilot-panel-actions">
            <div className="copilot-active-title">
              <span>Conversa ativa</span>
              <strong>{activeChat?.title ?? "Conversa"}</strong>
            </div>
            <div>
              <ShadcnButton
                type="button"
                variant="ghost"
                size="sm"
                disabled={!activeChat?.messages.some((message) => message.role === "user") || loading}
                onClick={() => void retryFromMessage(financialContext)}
              >
                <RotateCcw size={14} /> Retry
              </ShadcnButton>
              <ShadcnButton
                type="button"
                variant="ghost"
                size="sm"
                disabled={!activeChat?.messages.length || loading}
                onClick={() => activeChat && clearChat(activeChat.id)}
              >
                <Trash2 size={14} /> Limpar
              </ShadcnButton>
            </div>
          </div>

          <details className="copilot-context-card">
            <summary>
              <span><Bot size={14} /></span>
              <strong>Contexto financeiro carregado</strong>
              <small>ver resumo</small>
            </summary>
            <p>{snapshot.summary}</p>
          </details>

          {activeChat?.messages.length ? (
            <div className="copilot-messages" data-swipe-ignore>
              {activeChat.messages.map((message) => (
                <div
                  key={message.id}
                  className="copilot-message"
                  data-role={message.role}
                >
                  <div className="copilot-message-avatar">
                    {message.role === "assistant" ? <Bot size={15} /> : "Você".slice(0, 1)}
                  </div>
                  <div className="copilot-message-body">
                    <span className="copilot-message-author">
                      {message.role === "assistant" ? "MoneyCopilot" : "Você"}
                    </span>
                    {message.role === "assistant" ? (
                      <MarkdownMessage content={message.content} />
                    ) : (
                      <p>{message.content}</p>
                    )}
                  {message.role === "assistant" ? (
                    <div className="copilot-message-actions">
                      <ShadcnButton
                        type="button"
                        variant="ghost"
                        size="xs"
                        disabled={loading}
                        onClick={() => void retryFromMessage({ ...financialContext, messageId: message.id })}
                      >
                        <RotateCcw size={12} /> Tentar novamente
                      </ShadcnButton>
                    </div>
                  ) : null}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="copilot-message" data-role="assistant">
                  <div className="copilot-message-avatar">
                    <Bot size={15} />
                  </div>
                  <div className="copilot-message-body">
                    <span className="copilot-message-author">MoneyCopilot</span>
                    <p>Analisando seus dados...</p>
                  </div>
                </div>
              ) : null}
              {!loading && needsAssistantResponse ? (
                <div className="copilot-message" data-role="assistant">
                  <div className="copilot-message-avatar">
                    <Bot size={15} />
                  </div>
                  <div className="copilot-message-body">
                    <span className="copilot-message-author">MoneyCopilot</span>
                    <p>
                      Essa pergunta ficou sem resposta salva neste dispositivo.
                    </p>
                    <div className="copilot-message-actions">
                      <ShadcnButton
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => void retryFromMessage(financialContext)}
                      >
                        <RotateCcw size={12} /> Gerar resposta agora
                      </ShadcnButton>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="copilot-empty">
              <strong>Comece por uma pergunta concreta</strong>
              <p>Quanto mais específico o objetivo, melhor a análise: valor da compra, prazo desejado e margem de conforto.</p>
              <div className="copilot-suggestions">
                {suggestions.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.text}
                      type="button"
                      onClick={() => void sendMessage({ ...financialContext, prompt: suggestion.text })}
                    >
                      <Icon size={16} />
                      <span>{suggestion.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error ? (
            <div className="copilot-error">
              <span>{error}</span>
              <ShadcnButton
                type="button"
                variant="ghost"
                size="xs"
                disabled={loading}
                onClick={() => void retryFromMessage(financialContext)}
              >
                <RotateCcw size={12} /> Retry
              </ShadcnButton>
            </div>
          ) : null}

          <div className="copilot-composer" data-swipe-ignore>
            <Field
              multiline
              value={input}
              onChangeText={setInput}
              placeholder="Pergunte ao Copilot sobre compras, parcelas, orçamento ou onde economizar..."
            />
            <Button onPress={() => void sendMessage(financialContext)} loading={loading}>
              <Send size={16} /> Enviar
            </Button>
          </div>
        </section>
      </div>
    </Screen>
  );
}
