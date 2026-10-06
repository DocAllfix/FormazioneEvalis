import { describe, expect, it, vi } from "vitest";

// Il chatbot inoltra ad Azure solo una finestra limitata della conversazione: senza limiti un
// utente poteva mandare circa un milione di token per domanda.
const ricerche: string[] = [];
vi.mock("@/features/support/chatbot/rag", () => ({
  findRelevantContent: vi.fn(async (q: string) => {
    ricerche.push(q);
    return [];
  }),
}));

import { buildSupportChat, type ChatMessage } from "@/features/support/chatbot/chat";

const conv = (n: number): ChatMessage[] =>
  Array.from({ length: n }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: `messaggio ${i}` }));

describe("buildSupportChat — limiti", () => {
  it("una conversazione enorme viene ridotta agli ultimi 20 messaggi da al più 4000 caratteri", async () => {
    const messaggi = conv(199);
    messaggi[0] = { role: "user", content: "X".repeat(3_000_000) };
    messaggi.push({ role: "user", content: "Y".repeat(10_000) });
    const { history } = await buildSupportChat(messaggi);
    expect(history.length).toBeLessThanOrEqual(20);
    expect(Math.max(...history.map((m) => m.content.length))).toBeLessThanOrEqual(4000);
    expect(history.at(-1)).toEqual({ role: "user", content: "Y".repeat(4000) });
    expect(history[0].role).toBe("user");
    expect(ricerche.at(-1)!.length).toBeLessThanOrEqual(4000);
  });

  it("la finestra non comincia con una risposta dell'assistente", async () => {
    const { history } = await buildSupportChat(conv(22)); // 22 messaggi: gli ultimi 20 cominciano con user
    expect(history[0].role).toBe("user");
    const { history: h2 } = await buildSupportChat(conv(21)); // finestra di 20 comincerebbe con assistant
    expect(h2[0].role).toBe("user");
    expect(h2.at(-1)).toEqual(conv(21).at(-1));
  });

  it("una conversazione breve resta identica", async () => {
    const breve = conv(3);
    const { history } = await buildSupportChat(breve);
    expect(history).toEqual(breve);
  });
});
