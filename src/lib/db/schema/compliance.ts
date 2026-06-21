// Cluster C — Compliance, APPEND-ONLY (ARCHITETTURA.md §3) [BUILD]
//
// ⚠️ CLAUDE.md: questo schema non si tocca "di striscio". Qualsiasi modifica qui
// va segnalata esplicitamente prima di procedere — questi dati hanno valore legale.
//
// activity_log: log immodificabile di ogni attività (verb/object), con hash-chain
//   (prev_hash -> hash) per rilevare manomissioni. In produzione la scrittura
//   passa da un ruolo SQL con solo INSERT (REVOKE UPDATE/DELETE) + trigger.
// heartbeat: ping grezzi dal player (posizione, focus) per audit antifrode.
// certificate: emissione con gate di revisione umana (mai automatica).

import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { enrollment, lesson, slide } from "./catalog";

export const certificateStatus = pgEnum("certificate_status", [
  "ready_for_review",
  "approved",
  "issued",
  "revoked",
]);

// --- Audit log append-only (hash-chained) ---
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id"),
    // verbo xAPI-like (initialized/resumed/suspended/completed/passed/failed/answered/...)
    verb: text("verb").notNull(),
    // oggetto dell'azione (es. lesson:<id>, quiz:<id>, certificate:<id>)
    object: text("object").notNull(),
    payload: jsonb("payload"),
    // hash-chain: hash del record precedente nella catena dell'organizzazione
    prevHash: text("prev_hash"),
    hash: text("hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activity_log_org_idx").on(t.organizationId),
    index("activity_log_created_idx").on(t.createdAt),
    // integrità hash-chain: hash unico per org + traversal veloce per prev_hash
    uniqueIndex("activity_log_org_hash_uq").on(t.organizationId, t.hash),
    index("activity_log_org_prev_idx").on(t.organizationId, t.prevHash),
  ],
);

// --- Heartbeat grezzi dal player ---
export const heartbeat = pgTable(
  "heartbeat",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollment.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lesson.id, { onDelete: "cascade" }),
    // slide corrente (lezioni html); null per lezioni video/scorm
    slideId: uuid("slide_id").references(() => slide.id, { onDelete: "cascade" }),
    // posizione corrente nel video/clip (secondi)
    position: integer("position").notNull(),
    // finestra/tab attiva al momento del ping
    focus: boolean("focus").notNull(),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("heartbeat_enrollment_idx").on(t.enrollmentId)],
);

// --- Certificati (gate revisione umana) ---
export const certificate = pgTable(
  "certificate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollment.id, { onDelete: "cascade" }),
    status: certificateStatus("status").notNull().default("ready_for_review"),
    // numero attestato leggibile (valorizzato all'emissione)
    number: text("number").unique(),
    // token pubblico per la pagina /verify/:uuid
    verifyUuid: uuid("verify_uuid").notNull().defaultRandom().unique(),
    // percorso del PDF su Supabase Storage (valorizzato all'emissione)
    pdfPath: text("pdf_path"),
    // chi ha approvato (user.id) — mai automatico
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // un solo certificato per enrollment (idempotenza)
  (t) => [uniqueIndex("certificate_enrollment_uq").on(t.enrollmentId)],
);
