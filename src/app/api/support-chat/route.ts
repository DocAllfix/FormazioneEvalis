// Endpoint chatbot di supporto: RAG-lite + streaming token-by-token (risposta che inizia subito)
// + memoria della conversazione (l'intero storico messaggi viene inviato al modello).
// Gated a sessione. Header x-rag-hits per indicare al client se proporre il ticket.

import { streamText } from "ai";
import { chatModel, azureConfigured } from "@/lib/ai/azure";
import { getCurrentSession } from "@/lib/auth/server";
import { buildSupportChat, type ChatMessage } from "@/features/support/chatbot/chat";
import { checkLimit, tooManyRequests } from "@/lib/security/rate-limit";

// runtime "nodejs" è il default in Next 16 (e incompatibile con cacheComponents) → non dichiarato.
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!azureConfigured) return new Response("Chatbot non configurato", { status: 503 });

  const session = await getCurrentSession();
  if (!session) return new Response("unauthorized", { status: 401 });

  // C-1: ogni messaggio = 1 embedding + 1 completion Azure (costo). Cap per utente/minuto.
  if (!(await checkLimit(`chat:${session.user.id}`, 20, 60_000))) return tooManyRequests(60_000);

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const messages = (body.messages ?? []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
  );
  if (messages.length === 0) return new Response("no messages", { status: 400 });

  const { system, history, hitCount } = await buildSupportChat(messages);

  const result = streamText({
    model: chatModel,
    system,
    messages: history,
    temperature: 0.2,
    maxOutputTokens: 600,
  });

  return result.toTextStreamResponse({
    headers: { "x-rag-hits": String(hitCount) },
  });
}
