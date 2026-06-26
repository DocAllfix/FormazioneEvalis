// RAG chatbot — smoke live: reindex, retrieval, e risposta grounded/fallback via LLM.
// Richiede Azure → skip se non configurato.

import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { azureConfigured, chatModel, withRetry } from "@/lib/ai/azure";
import { reindexKnowledge } from "@/features/support/chatbot/ingest";
import { findRelevantContent } from "@/features/support/chatbot/rag";
import { buildSupportChat } from "@/features/support/chatbot/chat";

describe.skipIf(!azureConfigured)("Chatbot RAG — smoke", () => {
  it("reindex popola il KB (FAQ + corsi)", async () => {
    const r = await reindexKnowledge();
    console.log("REINDEX", JSON.stringify(r));
    expect(r.documents).toBeGreaterThanOrEqual(8);
    expect(r.chunks).toBeGreaterThan(0);
  }, 120_000);

  it("retrieval: discrimina in-scope vs fuori-scope", async () => {
    const inScope = await findRelevantContent("come verifico l'autenticità di un certificato con il QR code?", 4, 0);
    const outScope = await findRelevantContent("qual è la ricetta della carbonara alla romana?", 4, 0);
    console.log("SIM inScope=", inScope[0]?.similarity?.toFixed(3), "outScope=", outScope[0]?.similarity?.toFixed(3));
    expect(inScope[0].content.toLowerCase()).toContain("qr");
    expect(inScope[0].similarity).toBeGreaterThan(0.4);
    expect(outScope[0]?.similarity ?? 0).toBeLessThan(inScope[0].similarity - 0.1);
  }, 60_000);

  it("risposta grounded: in-scope cita il KB", async () => {
    const { system, history, hitCount } = await buildSupportChat([
      { role: "user", content: "come faccio a verificare un certificato?" },
    ]);
    expect(hitCount).toBeGreaterThan(0);
    const { text } = await withRetry(() =>
      generateText({ model: chatModel, system, messages: history, maxOutputTokens: 300 }),
    );
    console.log("ANSWER", text.slice(0, 200));
    expect(text.toLowerCase()).toMatch(/qr|verific|link/);
  }, 60_000);

  it("fallback: fuori scope → propone il ticket/assistenza", async () => {
    const { system, history, hitCount } = await buildSupportChat([
      { role: "user", content: "qual è la ricetta della carbonara?" },
    ]);
    expect(hitCount).toBe(0);
    const { text } = await withRetry(() =>
      generateText({ model: chatModel, system, messages: history, maxOutputTokens: 200 }),
    );
    console.log("FALLBACK", text.slice(0, 200));
    expect(text.toLowerCase()).toMatch(/ticket|assistenza/);
  }, 60_000);

  it("memoria conversazione: usa il turno precedente", async () => {
    const { system, history } = await buildSupportChat([
      { role: "user", content: "Mi serve aiuto con il certificato" },
      { role: "assistant", content: "Certo, dimmi pure cosa ti serve sul certificato." },
      { role: "user", content: "Come lo verifico?" },
    ]);
    const { text } = await withRetry(() =>
      generateText({ model: chatModel, system, messages: history, maxOutputTokens: 200 }),
    );
    console.log("MEMORY", text.slice(0, 160));
    expect(text.toLowerCase()).toMatch(/qr|verific|link/);
  }, 60_000);
});
