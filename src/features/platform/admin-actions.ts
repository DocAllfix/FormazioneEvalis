"use server";

// Promozione/rimozione admin di piattaforma. Solo un admin esistente può promuovere
// (la allowlist email resta il bootstrap iniziale → niente lockout). input platformRole
// non è auto-assegnabile dall'utente (better-auth input:false).
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requirePlatformAdmin } from "@/features/auth/guards";

export async function promotePlatformAdminAction(email: string): Promise<void> {
  await requirePlatformAdmin();
  const target = email.trim().toLowerCase();
  if (!target) throw new Error("Email mancante.");
  const [u] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${target}`)
    .limit(1);
  if (!u) throw new Error("Nessun utente con questa email. Deve prima registrarsi.");
  await db.update(user).set({ platformRole: "admin" }).where(eq(user.id, u.id));
}

export async function revokePlatformAdminAction(userId: string): Promise<void> {
  const ctx = await requirePlatformAdmin();
  if (ctx.user.id === userId) throw new Error("Non puoi rimuovere te stesso dagli admin.");
  await db.update(user).set({ platformRole: null }).where(eq(user.id, userId));
}
