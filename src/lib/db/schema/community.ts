// Forum community (Fase 2C). GLOBALE: una sola community per tutti i discenti → niente
// organization_id. L'autorizzazione è a livello applicativo (autore per i propri post,
// staff piattaforma per la moderazione). RLS abilitata con policy passthrough scoped al ruolo
// `app_rls` (migration): i ruoli PostgREST restano negati, l'app accede. Non tenant-isolato.

import { pgTable, text, uuid, integer, boolean, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const category = pgTable(
  "forum_category",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("forum_category_slug_uq").on(t.slug)],
);

export const thread = pgTable(
  "forum_thread",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    locked: boolean("locked").notNull().default(false),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastPostAt: timestamp("last_post_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("forum_thread_category_idx").on(t.categoryId),
    index("forum_thread_lastpost_idx").on(t.lastPostAt),
  ],
);

export const post = pgTable(
  "forum_post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => thread.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_post_thread_idx").on(t.threadId)],
);

export const postReport = pgTable(
  "forum_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_report_post_idx").on(t.postId)],
);

export const moderationLog = pgTable(
  "forum_moderation_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: text("staff_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    target: text("target").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_modlog_created_idx").on(t.createdAt)],
);
