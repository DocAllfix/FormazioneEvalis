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

export async function buildSupportChat(messages: ChatMessage[]): Promise<{
  system: string;
  history: ChatMessage[];
  hitCount: number;
  topSimilarity: number;
}> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const hits = lastUser ? await findRelevantContent(lastUser, 4, 0.25) : [];
  const relevant = hits.filter((h) => h.similarity >= RELEVANCE_THRESHOLD);
  const context = relevant.length
    ? relevant.map((h, i) => `[${i + 1}] ${h.title}\n${h.content}`).join("\n\n")
    : "(nessun contenuto pertinente trovato nel knowledge base)";
  const system = `${SYSTEM_BASE}\n\nCONTEXT:\n${context}`;
  const history = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
  return { system, history, hitCount: relevant.length, topSimilarity: hits[0]?.similarity ?? 0 };
}
