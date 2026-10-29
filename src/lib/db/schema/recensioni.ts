// Recensioni dei corsi (migrazione 0037, scritta a mano con RLS e le due funzioni pubbliche).
// Una per iscrizione; la scrive solo chi ha il certificato. Va sul sito solo se l'utente ha
// acconsentito (`pubblicazione` ≠ 'no') e lo staff l'ha approvata.

import { pgTable, text, uuid, timestamp, smallint, integer, boolean, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { course, enrollment } from "./catalog";

export const courseReview = pgTable(
  "course_review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .unique()
      .references(() => enrollment.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    votoCorso: smallint("voto_corso").notNull(),
    votoPiattaforma: smallint("voto_piattaforma"),
    testo: text("testo").notNull().default(""),
    pubblicazione: text("pubblicazione").notNull().default("no"),
    nomePubblico: text("nome_pubblico"),
    consensoIl: timestamp("consenso_il", { withTimezone: true }),
    consensoVersione: integer("consenso_versione"),
    stato: text("stato").notNull().default("da_approvare"),
    inEvidenza: boolean("in_evidenza").notNull().default(false),
    moderataDa: text("moderata_da"),
    moderataIl: timestamp("moderata_il", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("course_review_course_idx").on(t.courseId), index("course_review_user_idx").on(t.userId)],
);
