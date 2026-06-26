// Knowledge base del chatbot (2B). Contenuti GLOBALI (FAQ statiche + descrizioni corsi):
// non tenant-isolati → tabelle non-tenant (passthrough app_rls, come community). Pipeline:
// documento → chunk → embedding pgvector(1536). Retrieval per similarità coseno (indice HNSW).

import { pgTable, text, uuid, integer, timestamp, index, vector } from "drizzle-orm/pg-core";

export const kbDocument = pgTable("kb_document", {
  id: uuid("id").primaryKey().defaultRandom(),
  // 'faq' | 'course'
  sourceType: text("source_type").notNull(),
  // id della sorgente nel dominio (es. course.id) per re-ingest mirato; null per FAQ statiche
  sourceId: text("source_id"),
  title: text("title").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kbChunk = pgTable(
  "kb_chunk",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => kbDocument.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull().default(0),
  },
  (t) => [index("kb_chunk_document_idx").on(t.documentId)],
);

export const kbEmbedding = pgTable("kb_embedding", {
  id: uuid("id").primaryKey().defaultRandom(),
  chunkId: uuid("chunk_id")
    .notNull()
    .references(() => kbChunk.id, { onDelete: "cascade" }),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
});
