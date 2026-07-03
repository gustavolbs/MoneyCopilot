"use client";

import { Bot, Car, MessageSquarePlus, RotateCcw, Send, ShoppingBag, Trash2, TrendingDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button, Field, Label, Screen, Title } from "@/components/ui";
import { Button as ShadcnButton } from "@/components/ui/button";
import {
  buildCopilotFinancialSnapshot,
  type CopilotChat,
  type CopilotChatMessage,
} from "@/domain/copilot";
import { useAppStore } from "@/store/appStore";

import { MarkdownMessage } from "./markdown-message";

const storageKey = "moneycopilot:copilot-chats:v1";

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

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createChat(title = "Nova conversa"): CopilotChat {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function titleFromPrompt(prompt: string) {
  return prompt.trim().slice(0, 54) || "Nova conversa";
}

export function CopilotView() {
  const { accounts, budgets, categories, recurrences, transactions } = useAppStore();
  const [chats, setChats] = useState<CopilotChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      const chat = createChat("Planejamento financeiro");
      setChats([chat]);
      setActiveChatId(chat.id);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CopilotChat[];
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty");
      setChats(parsed);
      setActiveChatId(parsed[0].id);
    } catch {
      const chat = createChat("Planejamento financeiro");
      setChats([chat]);
      setActiveChatId(chat.id);
    }
  }, []);

  useEffect(() => {
    if (chats.length) window.localStorage.setItem(storageKey, JSON.stringify(chats));
  }, [chats]);

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? chats[0] ?? null;
  const snapshot = useMemo(
    () =>
      buildCopilotFinancialSnapshot({
        accounts,
        budgets,
        categories,
        messages: activeChat?.messages ?? [],
        recurrences,
        transactions,
      }),
    [accounts, activeChat?.messages, budgets, categories, recurrences, transactions],
  );

  const startChat = (initialPrompt?: string) => {
    const chat = createChat(initialPrompt ? titleFromPrompt(initialPrompt) : "Nova conversa");
    setChats((current) => [chat, ...current]);
    setActiveChatId(chat.id);
    if (initialPrompt) setInput(initialPrompt);
  };

  const deleteChat = (chatId: string) => {
    setChats((current) => {
      const next = current.filter((chat) => chat.id !== chatId);
      if (!next.length) {
        const fallback = createChat("Planejamento financeiro");
        setActiveChatId(fallback.id);
        return [fallback];
      }
      if (activeChatId === chatId) setActiveChatId(next[0].id);
      return next;
    });
    setError(null);
  };

  const clearChat = (chatId: string) => {
    updateChat(chatId, (chat) => ({
      ...chat,
      updatedAt: new Date().toISOString(),
      messages: [],
    }));
    setError(null);
  };

  const updateChat = (chatId: string, updater: (chat: CopilotChat) => CopilotChat) => {
    setChats((current) =>
      current.map((chat) => (chat.id === chatId ? updater(chat) : chat)),
    );
  };

  const requestAssistant = async (chatId: string, messages: CopilotChatMessage[]) => {
    setError(null);
    setLoading(true);
    const adaptiveSnapshot = buildCopilotFinancialSnapshot({
      accounts,
      budgets,
      categories,
      messages,
      recurrences,
      transactions,
    });
    try {
      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, snapshot: adaptiveSnapshot }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Erro ao chamar o Copilot.");
      const assistantMessage: CopilotChatMessage = {
        id: createId(),
        role: "assistant",
        content: String(payload.content ?? ""),
        createdAt: new Date().toISOString(),
      };
      updateChat(chatId, (current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        messages: [...messages, assistantMessage],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao chamar o Copilot.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (prompt = input) => {
    const content = prompt.trim();
    if (!content || loading) return;
    const chat = activeChat ?? createChat(titleFromPrompt(content));
    if (!activeChat) {
      setChats((current) => [chat, ...current]);
      setActiveChatId(chat.id);
    }

    const userMessage: CopilotChatMessage = {
      id: createId(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const messages = [...chat.messages, userMessage];
    setInput("");
    setError(null);
    setLoading(true);
    updateChat(chat.id, (current) => ({
      ...current,
      title: current.messages.length ? current.title : titleFromPrompt(content),
      updatedAt: new Date().toISOString(),
      messages,
    }));

    await requestAssistant(chat.id, messages);
  };

  const retryFromMessage = async (messageId?: string) => {
    if (!activeChat || loading) return;
    const messages = activeChat.messages;
    const targetIndex = messageId
      ? messages.findIndex((message) => message.id === messageId)
      : messages.length - 1;
    if (targetIndex < 0) return;
    const baseIndex =
      messages[targetIndex]?.role === "assistant"
        ? targetIndex
        : targetIndex + 1;
    const baseMessages = messages.slice(0, baseIndex);
    const lastUserMessage = [...baseMessages].reverse().find((message) => message.role === "user");
    if (!lastUserMessage) return;

    updateChat(activeChat.id, (chat) => ({
      ...chat,
      updatedAt: new Date().toISOString(),
      messages: baseMessages,
    }));
    await requestAssistant(activeChat.id, baseMessages);
  };

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
                <button type="button" onClick={() => setActiveChatId(chat.id)}>
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
                onClick={() => void retryFromMessage()}
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
                        onClick={() => void retryFromMessage(message.id)}
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
                      onClick={() => void sendMessage(suggestion.text)}
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
                onClick={() => void retryFromMessage()}
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
            <Button onPress={() => void sendMessage()} loading={loading}>
              <Send size={16} /> Enviar
            </Button>
          </div>
        </section>
      </div>
    </Screen>
  );
}
