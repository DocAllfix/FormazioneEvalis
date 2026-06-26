// Smoke live Azure OpenAI via AI SDK (path resiliente con retry). Skip se env non configurate.

import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { chatModel, embedQuery, embedTexts, azureConfigured, withRetry, EMBEDDING_DIMENSIONS } from "@/lib/ai/azure";

describe.skipIf(!azureConfigured)("Azure OpenAI — smoke SDK", () => {
  it("chat: genera testo", async () => {
    const { text } = await withRetry(() =>
      generateText({ model: chatModel, prompt: "Rispondi con una sola parola minuscola: ok" }),
    );
    expect(text.toLowerCase()).toContain("ok");
  }, 30_000);

  it("embeddings: query 1536", async () => {
    const v = await embedQuery("ciao mondo");
    expect(v.length).toBe(EMBEDDING_DIMENSIONS);
  }, 30_000);

  it("embeddings: batch", async () => {
    const vs = await embedTexts(["uno", "due", "tre"]);
    expect(vs.length).toBe(3);
    expect(vs[0].length).toBe(EMBEDDING_DIMENSIONS);
  }, 30_000);
});
