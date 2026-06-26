// Provider Azure OpenAI (Data Zone Standard, Italy North — UE), API v1 OpenAI-compatible
// (.../openai/v1). L'endpoint v1 va chiamato con header `api-key`: l'auth `Authorization: Bearer`
// (default dell'SDK) dà errori intermittenti — quindi forziamo `api-key` via fetch custom.
//
// NB propagazione: un deployment appena creato sul Data Zone può rispondere "Unknown model"
// in modo intermittente finché non è sincronizzato su tutti i backend. L'SDK NON ritenta i 404,
// quindi avvolgiamo le chiamate in withRetry (transitori). Si stabilizza col tempo.

import { embed, embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY ?? "";
const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "";
const embedDeployment = process.env.AZURE_OPENAI_EMBED_DEPLOYMENT ?? "";

export const azureConfigured = Boolean(endpoint && apiKey && chatDeployment && embedDeployment);
export const EMBEDDING_DIMENSIONS = 1536;

const provider = createOpenAI({
  baseURL: endpoint,
  apiKey, // richiesto dall'SDK; l'auth reale è imposta sotto come header `api-key`
  fetch: ((url: string | URL | Request, options?: RequestInit) => {
    const headers = new Headers(options?.headers);
    headers.delete("authorization");
    headers.set("api-key", apiKey);
    // `Connection: close` → niente keep-alive: ogni richiesta apre una connessione fresca,
    // load-balanced sui backend del Data Zone. Senza, undici pinna la connessione a UN backend
    // e, se quello non ha ancora sincronizzato il deployment embeddings (propagazione), ritorna
    // "Unknown model" in modo sostenuto. Vedi diagnosi: 8/15 → 14/15 con questo header.
    headers.set("connection", "close");
    return fetch(url, { ...options, headers });
  }) as typeof fetch,
});

export const chatModel = provider.chat(chatDeployment);
export const embeddingModel = provider.embedding(embedDeployment);

/** Ritenta i transitori (propagazione deployment "Unknown model", 429, 5xx, rete) con backoff
 * esponenziale + JITTER (decorrela i retry sotto burst concorrente). */
export async function withRetry<T>(fn: () => Promise<T>, tries = 7): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const transient = /Unknown model|rate limit|429|temporar|timeout|ECONN|ETIMEDOUT|fetch failed|50[234]/i.test(msg);
      if (!transient || i === tries - 1) throw e;
      const backoff = 250 * 2 ** i + Math.floor(Math.random() * 250); // jitter
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

/** Embedding di una query (con retry). `tries` basso sul path interattivo → degrada in fretta. */
export async function embedQuery(value: string, tries = 4): Promise<number[]> {
  const { embedding } = await withRetry(() => embed({ model: embeddingModel, value }), tries);
  return embedding;
}

/** Embedding batch (con retry). */
export async function embedTexts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];
  const { embeddings } = await withRetry(() => embedMany({ model: embeddingModel, values }));
  return embeddings;
}
