// Ingest del knowledge base: FAQ statiche + descrizioni dei corsi pubblicati (globali) →
// chunk → embedding batch (Azure) → pgvector. Rebuild completo (KB piccolo). Gated allo staff.

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { kbDocument, kbChunk, kbEmbedding, course } from "@/lib/db/schema";
import { embedTexts } from "@/lib/ai/azure";
import { chunkText } from "./rag";
import { FAQ } from "@/content/faq";

type CourseDetails = {
  audience?: string;
  objectives?: string[];
  level?: string;
  language?: string;
  certInfo?: string;
} | null;

function courseText(c: { description: string | null; details: unknown }): string {
  const d = c.details as CourseDetails;
  const parts: string[] = [];
  if (c.description) parts.push(c.description);
  if (d?.audience) parts.push(`A chi è rivolto: ${d.audience}`);
  if (d?.objectives?.length) parts.push(`Obiettivi: ${d.objectives.join("; ")}`);
  if (d?.level) parts.push(`Livello: ${d.level}`);
  if (d?.certInfo) parts.push(`Certificato: ${d.certInfo}`);
  return parts.join("\n\n");
}

export async function reindexKnowledge(): Promise<{ documents: number; chunks: number }> {
  const sources: { sourceType: string; sourceId: string | null; title: string; text: string }[] = [];

  for (const f of FAQ) sources.push({ sourceType: "faq", sourceId: null, title: f.title, text: f.body });

  const courses = await db
    .select({ id: course.id, title: course.title, description: course.description, details: course.details })
    .from(course)
    .where(and(eq(course.status, "published"), isNull(course.organizationId)));
  for (const c of courses) {
    const text = courseText(c);
    if (text.trim()) sources.push({ sourceType: "course", sourceId: c.id, title: c.title, text });
  }

  // Rebuild completo: svuota (cascade su chunk/embedding) e reinserisci.
  await db.delete(kbDocument);

  let chunkCount = 0;
  for (const s of sources) {
    const chunks = chunkText(`${s.title}\n\n${s.text}`);
    if (chunks.length === 0) continue;
    const [doc] = await db
      .insert(kbDocument)
      .values({ sourceType: s.sourceType, sourceId: s.sourceId, title: s.title })
      .returning({ id: kbDocument.id });
    const insertedChunks = await db
      .insert(kbChunk)
      .values(chunks.map((content, i) => ({ documentId: doc.id, content, chunkIndex: i })))
      .returning({ id: kbChunk.id });
    const vectors = await embedTexts(chunks);
    await db
      .insert(kbEmbedding)
      .values(insertedChunks.map((ch, i) => ({ chunkId: ch.id, embedding: vectors[i] })));
    chunkCount += chunks.length;
  }

  return { documents: sources.length, chunks: chunkCount };
}
