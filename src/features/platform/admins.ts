// Lettura admin di piattaforma (Evalis). Gated requirePlatformAdmin.
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requirePlatformAdmin } from "@/features/auth/guards";

export type PlatformAdmin = { id: string; name: string; email: string };

export async function listPlatformAdmins(): Promise<PlatformAdmin[]> {
  await requirePlatformAdmin();
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.platformRole, "admin"));
}
