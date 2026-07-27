// Crea (o elimina con --del) un utente di PROVA verificato, per verificare l'esperienza
// d'acquisto di un cliente nuovo (badge prezzo lancio, checkout). Nessun corso assegnato.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";
import { user, account, organization, member, userOnboarding } from "@/lib/db/schema";
import { serializeOrgMetadata } from "@/features/auth/org-metadata";

const EMAIL = "prova-listino@evalisacademy.it";
const PW = "ProvaListino2026!";

if (process.argv.includes("--del")) {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, EMAIL)).limit(1);
  if (u) {
    await db.delete(userOnboarding).where(eq(userOnboarding.userId, u.id));
    await db.delete(member).where(eq(member.userId, u.id));
    await db.delete(organization).where(eq(organization.slug, `u-${u.id}`));
    await db.delete(account).where(eq(account.userId, u.id));
    await db.delete(user).where(eq(user.id, u.id));
    console.log("utente di prova eliminato");
  } else console.log("nessun utente di prova");
  process.exit(0);
}

const id = `prova-${Date.now()}`;
await db.insert(user).values({ id, name: "Prova Listino", email: EMAIL, emailVerified: true, createdAt: new Date(), updatedAt: new Date() });
await db.insert(account).values({
  id: `acc-${id}`, userId: id, accountId: id, providerId: "credential",
  password: await hashPassword(PW), createdAt: new Date(), updatedAt: new Date(),
});
const orgId = `org-${id}`;
await db.insert(organization).values({
  id: orgId, name: "Spazio personale", slug: `u-${id}`, createdAt: new Date(),
  metadata: serializeOrgMetadata({ type: "personal", seatLimit: 1 }),
});
await db.insert(member).values({ id: `mem-${id}`, organizationId: orgId, userId: id, role: "owner", createdAt: new Date() });
// onboarding già concluso: la prova riguarda il catalogo/acquisto, non il wizard iniziale
await db.insert(userOnboarding).values({
  userId: id, organizationId: orgId, persona: "b2c", status: "skipped", currentStep: 0,
});
console.log("utente di prova creato:", EMAIL);
process.exit(0);
