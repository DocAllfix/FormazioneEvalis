// Dati anagrafici per il certificato accreditato (migrazione 0031). Una riga per utente.
// Dati personali: RLS per-utente, lo staff le legge tutte. Mai nella verifica pubblica.

import { pgTable, text, date, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const anagraficaCertificato = pgTable("anagrafica_certificato", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  codiceFiscale: text("codice_fiscale").notNull(),
  // "AAAA-MM-GG": una data di nascita non ha fuso orario
  dataNascita: date("data_nascita", { mode: "string" }).notNull(),
  luogoNascita: text("luogo_nascita").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
