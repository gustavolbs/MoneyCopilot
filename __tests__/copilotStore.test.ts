import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultCategories } from "@/domain/categories";
import { chatNeedsAssistantResponse, useCopilotStore } from "@/store/copilotStore";

const copilotStorageKey = "moneycopilot:copilot-chats:v1";

function installLocalStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  return values;
}

describe("copilot store", () => {
  beforeEach(() => {
    useCopilotStore.setState({
      chats: [],
      activeChatId: null,
      input: "",
      loading: false,
      error: null,
      hydrated: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hydrates cached chats for offline use", async () => {
    installLocalStorage({
      [copilotStorageKey]: JSON.stringify([
        {
          id: "chat-offline",
          title: "Compra de carro",
          createdAt: "2026-07-03T00:00:00.000Z",
          updatedAt: "2026-07-03T00:00:00.000Z",
          messages: [
            {
              id: "message-1",
              role: "user",
              content: "Quanto posso pagar em um carro?",
              createdAt: "2026-07-03T00:00:00.000Z",
            },
          ],
        },
      ]),
    });
    useCopilotStore.setState({ hydrated: false });

    await useCopilotStore.getState().hydrate();

    expect(useCopilotStore.getState().activeChatId).toBe("chat-offline");
    expect(useCopilotStore.getState().chats[0]).toMatchObject({
      id: "chat-offline",
      title: "Compra de carro",
    });
  });

  it("keeps the assistant request outside of the Copilot page component", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          content: "Resposta gravada mesmo sem componente montado.",
        }),
      ),
    );

    const send = useCopilotStore.getState().sendMessage({
      accounts: [],
      budgets: [],
      categories: defaultCategories,
      recurrences: [],
      transactions: [],
      prompt: "Planeje minha obra.",
    });

    expect(useCopilotStore.getState().chats[0].messages).toHaveLength(1);
    await send;

    const chat = useCopilotStore.getState().chats[0];
    expect(chat.messages).toHaveLength(2);
    expect(chat.messages[1]).toMatchObject({
      role: "assistant",
      content: "Resposta gravada mesmo sem componente montado.",
    });
    expect(useCopilotStore.getState().loading).toBe(false);
  });

  it("detects and retries a chat that ended without an assistant response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          content: "Resposta regenerada.",
        }),
      ),
    );

    useCopilotStore.setState({
      chats: [
        {
          id: "chat-unanswered",
          title: "Obra",
          createdAt: "2026-07-03T00:00:00.000Z",
          updatedAt: "2026-07-03T00:00:00.000Z",
          messages: [
            {
              id: "user-1",
              role: "user",
              content: "Planeje minha obra.",
              createdAt: "2026-07-03T00:00:00.000Z",
            },
          ],
        },
      ],
      activeChatId: "chat-unanswered",
    });

    expect(chatNeedsAssistantResponse(useCopilotStore.getState().chats[0])).toBe(true);

    await useCopilotStore.getState().retryFromMessage({
      accounts: [],
      budgets: [],
      categories: defaultCategories,
      recurrences: [],
      transactions: [],
    });

    const chat = useCopilotStore.getState().chats[0];
    expect(chatNeedsAssistantResponse(chat)).toBe(false);
    expect(chat.messages.at(-1)).toMatchObject({
      role: "assistant",
      content: "Resposta regenerada.",
    });
  });
});
