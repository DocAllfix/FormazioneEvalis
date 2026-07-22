// Cluster security — rate limiting (C-1 audit go-live).
//
// rate_limit: contatore a finestra fissa. Chiave = "<scope>:<identificatore>" (es. "auth:signin:<ip>"),
// window_start = inizio della finestra in ms epoch. Un upsert atomico incrementa il contatore; se
// supera la soglia nella finestra, la richiesta viene rifiutata (429). Tabella globale non-tenant,
// nessun dato utente sensibile. Scelta Postgres (nessun servizio esterno) — vedi piano audit.

import { pgTable, text, bigint, integer, primaryKey } from "drizzle-orm/pg-core";

export const rateLimit = pgTable(
  "rate_limit",
  {
    key: text("key").notNull(),
    windowStart: bigint("window_start", { mode: "number" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
