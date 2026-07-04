"use client";

import { create } from "zustand";

import {
  buildCopilotFinancialSnapshot,
  type CopilotChat,
  type CopilotChatMessage,
} from "@/domain/copilot";
import type { Account, Budget, Category, Recurrence, Transaction } from "@/domain/types";

const storageKey = "moneycopilot:copilot-chats:v1";
const indexedDbName = "moneycopilot-offline-db";
const indexedDbVersion = 2;
const indexedDbStore = "kv";
const indexedDbChatsKey = "copilot-chats";

let memoryChats: CopilotChat[] | null = null;
let indexedDbUnavailable = false;

type CopilotFinancialContext = {
  accounts: Account[];
  budgets: Budget[];
  categories: Category[];
  recurrences: Recurrence[];
  transactions: Transaction[];
};

type CopilotState = {
  chats: CopilotChat[];
  activeChatId: string | null;
  input: string;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setInput: (input: string) => void;
  startChat: (initialPrompt?: string) => void;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  clearChat: (chatId: string) => void;
  sendMessage: (params: CopilotFinancialContext & { prompt?: string }) => Promise<void>;
  retryFromMessage: (params: CopilotFinancialContext & { messageId?: string }) => Promise<void>;
};

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

function fallbackChats() {
  return [createChat("Planejamento financeiro")];
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && !indexedDbUnavailable && "indexedDB" in window;
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB indisponível."));
      return;
    }
    const request = window.indexedDB.open(indexedDbName, indexedDbVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(indexedDbStore)) db.createObjectStore(indexedDbStore);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Erro ao abrir IndexedDB."));
    request.onblocked = () => reject(new Error("IndexedDB bloqueado por outra aba."));
  });
}

function normalizeChats(chats: CopilotChat[] | null | undefined) {
  if (!Array.isArray(chats) || !chats.length) return fallbackChats();
  return chats.map((chat) => ({
    ...chat,
    messages: Array.isArray(chat.messages) ? chat.messages : [],
  }));
}

async function readIndexedChats(): Promise<CopilotChat[] | null> {
  if (!canUseIndexedDb()) return null;
  try {
    const db = await openOfflineDb();
    return await new Promise<CopilotChat[] | null>((resolve, reject) => {
      const transaction = db.transaction(indexedDbStore, "readonly");
      const store = transaction.objectStore(indexedDbStore);
      const request = store.get(indexedDbChatsKey);
      request.onsuccess = () => resolve((request.result as CopilotChat[] | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Erro ao ler conversas."));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => {
        db.close();
        reject(transaction.error ?? new Error("Transação IndexedDB falhou."));
      };
    });
  } catch {
    indexedDbUnavailable = true;
    return null;
  }
}

async function writeIndexedChats(chats: CopilotChat[]) {
  if (!canUseIndexedDb()) return false;
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(indexedDbStore, "readwrite");
      const store = transaction.objectStore(indexedDbStore);
      store.put(chats, indexedDbChatsKey);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error ?? new Error("Erro ao salvar conversas."));
      };
    });
    return true;
  } catch {
    indexedDbUnavailable = true;
    return false;
  }
}

function readLocalStorageChats() {
  if (typeof window === "undefined") return fallbackChats();
  try {
    const raw = window.localStorage?.getItem(storageKey);
    if (!raw) return null;
    return normalizeChats(JSON.parse(raw) as CopilotChat[]);
  } catch {
    return null;
  }
}

function writeLocalStorageChats(chats: CopilotChat[]) {
  if (typeof window === "undefined" || !chats.length) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(chats));
  } catch {
    // O IndexedDB/memória seguem como fonte quando o localStorage está indisponível.
  }
}

async function readChats() {
  if (typeof window === "undefined") return fallbackChats();

  const indexedChats = await readIndexedChats();
  if (indexedChats) {
    memoryChats = normalizeChats(indexedChats);
    return memoryChats;
  }

  const localStorageChats = readLocalStorageChats();
  if (localStorageChats) {
    memoryChats = localStorageChats;
    void writeIndexedChats(localStorageChats);
    return localStorageChats;
  }

  return memoryChats ? normalizeChats(memoryChats) : fallbackChats();
}

function persistChats(chats: CopilotChat[]) {
  if (!chats.length) return;
  const normalized = normalizeChats(chats);
  memoryChats = normalized;
  void writeIndexedChats(normalized).then((persisted) => {
    if (!persisted) writeLocalStorageChats(normalized);
  });
}

function updateChat(
  chats: CopilotChat[],
  chatId: string,
  updater: (chat: CopilotChat) => CopilotChat,
) {
  return chats.map((chat) => (chat.id === chatId ? updater(chat) : chat));
}

export function chatNeedsAssistantResponse(chat: CopilotChat | null | undefined) {
  const lastMessage = chat?.messages.at(-1);
  return lastMessage?.role === "user";
}

async function requestAssistant(
  chatId: string,
  messages: CopilotChatMessage[],
  context: CopilotFinancialContext,
  set: (patch: Partial<CopilotState> | ((state: CopilotState) => Partial<CopilotState>)) => void,
) {
  set({ error: null, loading: true });
  const adaptiveSnapshot = buildCopilotFinancialSnapshot({
    ...context,
    messages,
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

    set((state) => {
      const chats = updateChat(state.chats, chatId, (chat) => ({
        ...chat,
        updatedAt: new Date().toISOString(),
        messages: [...messages, assistantMessage],
      }));
      persistChats(chats);
      return { chats };
    });
  } catch (err) {
    set({
      error: err instanceof Error ? err.message : "Erro ao chamar o Copilot.",
    });
  } finally {
    set({ loading: false });
  }
}

export const useCopilotStore = create<CopilotState>((set, get) => ({
  chats: [],
  activeChatId: null,
  input: "",
  loading: false,
  error: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const chats = await readChats();
    set({
      chats,
      activeChatId: chats[0]?.id ?? null,
      hydrated: true,
    });
  },

  setInput: (input) => set({ input }),

  startChat: (initialPrompt) => {
    const chat = createChat(initialPrompt ? titleFromPrompt(initialPrompt) : "Nova conversa");
    set((state) => {
      const chats = [chat, ...state.chats];
      persistChats(chats);
      return {
        chats,
        activeChatId: chat.id,
        input: initialPrompt ?? state.input,
        error: null,
      };
    });
  },

  selectChat: (chatId) => set({ activeChatId: chatId }),

  deleteChat: (chatId) => {
    set((state) => {
      const next = state.chats.filter((chat) => chat.id !== chatId);
      const chats = next.length ? next : fallbackChats();
      persistChats(chats);
      return {
        chats,
        activeChatId:
          state.activeChatId === chatId
            ? chats[0]?.id ?? null
            : state.activeChatId,
        error: null,
      };
    });
  },

  clearChat: (chatId) => {
    set((state) => {
      const chats = updateChat(state.chats, chatId, (chat) => ({
        ...chat,
        updatedAt: new Date().toISOString(),
        messages: [],
      }));
      persistChats(chats);
      return { chats, error: null };
    });
  },

  sendMessage: async ({ prompt, ...context }) => {
    const state = get();
    const content = (prompt ?? state.input).trim();
    if (!content || state.loading) return;

    const chat = state.chats.find((item) => item.id === state.activeChatId) ?? createChat(titleFromPrompt(content));
    const chats = state.chats.some((item) => item.id === chat.id)
      ? state.chats
      : [chat, ...state.chats];
    const userMessage: CopilotChatMessage = {
      id: createId(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const messages = [...chat.messages, userMessage];

    const nextChats = updateChat(chats, chat.id, (current) => ({
      ...current,
      title: current.messages.length ? current.title : titleFromPrompt(content),
      updatedAt: new Date().toISOString(),
      messages,
    }));
    persistChats(nextChats);
    set({
      chats: nextChats,
      activeChatId: chat.id,
      input: "",
      error: null,
      loading: true,
    });

    await requestAssistant(chat.id, messages, context, set);
  },

  retryFromMessage: async ({ messageId, ...context }) => {
    const state = get();
    const activeChat = state.chats.find((chat) => chat.id === state.activeChatId) ?? state.chats[0];
    if (!activeChat || state.loading) return;

    const messages = activeChat.messages;
    const targetIndex = messageId
      ? messages.findIndex((message) => message.id === messageId)
      : messages.length - 1;
    if (targetIndex < 0) return;

    const baseIndex =
      messages[targetIndex]?.role === "assistant" ? targetIndex : targetIndex + 1;
    const baseMessages = messages.slice(0, baseIndex);
    const lastUserMessage = [...baseMessages]
      .reverse()
      .find((message) => message.role === "user");
    if (!lastUserMessage) return;

    const chats = updateChat(state.chats, activeChat.id, (chat) => ({
      ...chat,
      updatedAt: new Date().toISOString(),
      messages: baseMessages,
    }));
    persistChats(chats);
    set({ chats, error: null, loading: true });

    await requestAssistant(activeChat.id, baseMessages, context, set);
  },
}));
