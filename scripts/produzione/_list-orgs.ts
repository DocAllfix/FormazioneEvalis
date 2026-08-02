import "dotenv/config";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { parseOrgMetadata } from "@/features/auth/org-metadata";
const orgs = await db.select().from(organization).orderBy(desc(organization.createdAt)).limit(8);
for (const o of orgs) {
  const m = parseOrgMetadata(o.metadata);
  console.log(`${o.slug?.padEnd(20)} | ${(o.name ?? "").slice(0,28).padEnd(30)} | type=${m?.type ?? "?"} | seatLimit=${m?.seatLimit ?? "?"} | ${new Date(o.createdAt).toLocaleString("it-IT")}`);
}
process.exit(0);
