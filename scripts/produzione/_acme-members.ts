import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization, member, user } from "@/lib/db/schema";
const [org] = await db.select().from(organization).where(eq(organization.slug, "acme-test")).limit(1);
if (!org) { console.log("acme-test non trovata"); process.exit(0); }
console.log("org acme-test:", org.id);
const ms = await db.select({ userId: member.userId, role: member.role }).from(member).where(eq(member.organizationId, org.id));
const ids = ms.map(m => m.userId);
const us = ids.length ? await db.select({ id: user.id, email: user.email }).from(user).where(inArray(user.id, ids)) : [];
const emap = new Map(us.map(u => [u.id, u.email]));
console.log(`membri (${ms.length}):`);
for (const m of ms) console.log(`  ${m.role?.padEnd(7)} | ${emap.get(m.userId) ?? "?"} | ${m.userId}`);
process.exit(0);
