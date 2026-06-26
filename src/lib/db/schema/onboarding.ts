// Onboarding first-run (Fase 6). UNA riga per utente: traccia persona, step, obiettivo
// e stato (pending/completed/skipped). Tenant-sensibile → RLS reale (migration a mano):
//   user_onboarding: user_id = app.user_id  OR  app.platform_admin = 'on'
// `organization_id` aggancia l'eventuale audit alla catena dell'org dell'attore.

import { sql } from "drizzle-orm";
import { pgTable, text, uuid, integer, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user, organization } from "./auth";

// 'b2c' = learner auto-registrato · 'b2b_admin' = admin azienda · 'b2b_member' = dipendente invitato
export type OnboardingPersona = "b2c" | "b2b_admin" | "b2b_member";
// 'pending' = da fare · 'completed' = concluso · 'skipped' = saltato (non riproporre)
export type OnboardingStatus = "pending" | "completed" | "skipped";

export const userOnboarding = pgTable(
  "user_onboarding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    persona: text("persona").$type<OnboardingPersona>().notNull(),
    currentStep: integer("current_step").notNull().default(0),
    completedSteps: jsonb("completed_steps")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    // area scelta dal B2C (es. 'auditor_iso' | 'mestieri' | 'bancario'); null per gli altri
    goal: text("goal"),
    status: text("status").$type<OnboardingStatus>().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("user_onboarding_user_uq").on(t.userId)],
);
