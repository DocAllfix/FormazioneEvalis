// Costruzione del payload chat RAG: recupera il contesto dal KB e compone il system prompt
// "rispondi solo dal CONTEXT, altrimenti proponi un ticket". Riusato da route (streaming) e test.

import { findRelevantContent } from "./rag";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_BASE =
  "Sei l'assistente di supporto di Evalis Academy, piattaforma di formazione e certificazione. " +
  "Rispondi in italiano, in modo conciso, cortese e professionale, USANDO ESCLUSIVAMENTE le informazioni " +
  "nel CONTEXT qui sotto. Non inventare nulla che non sia nel CONTEXT. Se il CONTEXT non è sufficiente a " +
  "rispondere alla domanda, dillo onestamente in una frase e invita l'utente ad aprire un ticket dalla " +
  "sezione Assistenza (è disponibile un pulsante qui sotto). Mantieni le risposte brevi.";

const RELEVANCE_THRESHOLD = 0.4;

// Ad Azure arriva solo una finestra limitata della conversazione: la cronologia la manda il
// browser, e senza limiti una sola domanda poteva valere circa un milione di token (costo).
const MAX_MESSAGGI = 20;
const MAX_CARATTERI = 4000;

function finestra(messages: ChatMessage[]): ChatMessage[] {
  const ultimi = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_MESSAGGI)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARATTERI) }));
  // la finestra comincia sempre con una domanda dell'utente
  while (ultimi.length > 1 && ultimi[0].role !== "user") ultimi.shift();
  return ultimi;
}

export async function buildSupportChat(input: ChatMessage[]): Promise<{
  system: string;
  history: ChatMessage[];
  hitCount: number;
  topSimilarity: number;
}> {
  const messages = finestra(input);
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  // Graceful degradation: se il retrieval fallisce (es. propagazione deployment embeddings),
  // si procede SENZA contesto → il modello risponde col fallback "apri un ticket". Mai 500.
  let hits: Awaited<ReturnType<typeof findRelevantContent>> = [];
  if (lastUser) {
    try {
      hits = await findRelevantContent(lastUser, 4, 0.25);
    } catch (e) {
      console.error("[chatbot] retrieval fallito, degrado senza contesto:", e instanceof Error ? e.message : e);
    }
  }
  const relevant = hits.filter((h) => h.similarity >= RELEVANCE_THRESHOLD);
  const context = relevant.length
    ? relevant.map((h, i) => `[${i + 1}] ${h.title}\n${h.content}`).join("\n\n")
    : "(nessun contenuto pertinente trovato nel knowledge base)";
  const system = `${SYSTEM_BASE}\n\nCONTEXT:\n${context}`;
  const history = messages;
  return { system, history, hitCount: relevant.length, topSimilarity: hits[0]?.similarity ?? 0 };
}
