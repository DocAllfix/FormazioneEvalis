// Assistenza — ticketing (Fase 2A). Tenant-sensibile: un ticket appartiene al discente
// che lo apre; lo gestisce SOLO lo staff piattaforma (Evalis). RLS reale (migration a mano):
//   ticket: user_id = app.user_id  OR  app.platform_admin = 'on'
//   ticket_message: via EXISTS sul ticket padre (stesso scope).
// `organization_id` serve solo per agganciare l'evento audit alla catena dell'org dell'attore.

import { pgTable, pgEnum, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { user, organization } from "./auth";

export const ticketStatus = pgEnum("ticket_status", ["open", "pending", "closed"]);

export const ticket = pgTable(
  "ticket",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    status: ticketStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ticket_user_idx").on(t.userId),
    index("ticket_org_idx").on(t.organizationId),
    index("ticket_status_idx").on(t.status),
  ],
);

export const ticketMessage = pgTable(
  "ticket_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => ticket.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_message_ticket_idx").on(t.ticketId)],
);
