// RAG-lite: chunking + retrieval per similarità coseno su pgvector (indice HNSW).
// Il KB è globale (FAQ + descrizioni corsi) → nessun filtro per-tenant.

import { sql, cosineDistance, gt, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { kbChunk, kbDocument, kbEmbedding } from "@/lib/db/schema";
import { embedQuery } from "@/lib/ai/azure";

export type RetrievedChunk = {
  content: string;
  title: string;
  sourceType: string;
  similarity: number;
};

/** Spezza il testo in chunk ~paragrafo (max ~1200 char ≈ 300 token), senza tagliare a metà parola. */
export function chunkText(text: string, maxChars = 1200): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const paras = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && (cur.length + 2 + p.length) > maxChars) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
  }
  if (cur) chunks.push(cur);
  // un singolo paragrafo enorme → spezzato per lunghezza
  return chunks.flatMap((c) =>
    c.length <= maxChars * 1.5 ? [c] : (c.match(new RegExp(`[\\s\\S]{1,${maxChars}}`, "g")) ?? [c]),
  );
}

/** Recupera i chunk più simili alla query, sopra la soglia di similarità. */
export async function findRelevantContent(
  query: string,
  k = 4,
  minSimilarity = 0.3,
  embedTries = 4,
): Promise<RetrievedChunk[]> {
  const qVec = await embedQuery(query, embedTries);
  const similarity = sql<number>`1 - (${cosineDistance(kbEmbedding.embedding, qVec)})`;
  const rows = await db
    .select({
      content: kbChunk.content,
      title: kbDocument.title,
      sourceType: kbDocument.sourceType,
      similarity,
    })
    .from(kbEmbedding)
    .innerJoin(kbChunk, eq(kbChunk.id, kbEmbedding.chunkId))
    .innerJoin(kbDocument, eq(kbDocument.id, kbChunk.documentId))
    .where(gt(similarity, minSimilarity))
    .orderBy(desc(similarity))
    .limit(k);
  return rows;
}
