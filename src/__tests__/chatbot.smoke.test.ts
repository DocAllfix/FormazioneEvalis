// RAG chatbot — smoke live: reindex del KB e retrieval (in-scope vs fuori-scope) per tarare la
// soglia di fallback. Richiede Azure (embeddings) → skip se non configurato.

import { describe, it, expect } from "vitest";
import { azureConfigured } from "@/lib/ai/azure";
import { reindexKnowledge } from "@/features/support/chatbot/ingest";
import { findRelevantContent } from "@/features/support/chatbot/rag";

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
    console.log("SIM inScope top=", inScope[0]?.similarity?.toFixed(3), "outScope top=", outScope[0]?.similarity?.toFixed(3));
    expect(inScope.length).toBeGreaterThan(0);
    expect(inScope[0].content.toLowerCase()).toContain("qr");
    expect(inScope[0].similarity).toBeGreaterThan(0.4);
    // la domanda fuori scope deve stare nettamente sotto
    expect(outScope[0]?.similarity ?? 0).toBeLessThan(inScope[0].similarity - 0.1);
  }, 60_000);
});
