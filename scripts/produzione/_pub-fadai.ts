// Pubblica i 2 corsi Claude: category=ai, descrizioni, durationHours, status=published,
// e li iscrive all'utente indicato. Idempotente. Uso: npx tsx scripts/produzione/_pub-fadai.ts <email>
import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import * as S from "@/lib/db/schema";

const email = process.argv[2] ?? "dilonardoa28@gmail.com";

const DATA: Record<string, { tag: string; durationHours: number; description: string }> = {
  fadai01: {
    tag: "FAD-AI-01",
    durationHours: 16,
    description:
      "Usare l'intelligenza artificiale (Claude) nel lavoro professionale quotidiano: prompt efficaci, analisi di documenti, gap analysis, casi d'uso reali e confini di responsabilità. Livello operativo, con esame finale e certificato.",
  },
  fadai02: {
    tag: "FAD-AI-02",
    durationHours: 24,
    description:
      "Livello avanzato: automazioni via API, workflow agentici e MCP, sviluppo assistito, portafoglio di adozione e governance dell'AI con i sistemi di gestione ISO/IEC 42001. Con esame finale e certificato.",
  },
};

const rows = await db.select().from(S.course);
const found: { key: string; id: string; slug: string; orgId: string }[] = [];
for (const [key, d] of Object.entries(DATA)) {
  const c = rows.find((r) => (r.title || "").includes(d.tag));
  if (!c) { console.log(`✗ ${key}: corso non trovato`); continue; }
  await db.update(S.course).set({
    category: "ai",
    description: d.description,
    durationHours: d.durationHours,
    status: "published",
  }).where(eq(S.course.id, c.id));
  found.push({ key, id: c.id, slug: c.slug as string, orgId: (c as any).organizationId });
  console.log(`✓ ${key}: category=ai, ${d.durationHours}h, published, descrizione impostata — slug=${c.slug}`);
}

// utente + org
const [u] = await db.select().from(S.user).where(eq(S.user.email, email)).limit(1);
if (!u) { console.log(`\n✗ utente ${email} non trovato`); process.exit(1); }
const mem = await db.select().from(S.member).where(eq(S.member.userId, u.id));
console.log(`\nutente ${email} id=${u.id} · org membership: ${mem.map((m) => (m as any).organizationId).join(", ") || "NESSUNA"}`);
console.log("colonne enrollment:", Object.keys((await db.select().from(S.enrollment).limit(1))[0] ?? {}).join(", ") || "(tabella vuota)");
console.log("colonne member:", Object.keys(mem[0] ?? {}).join(", ") || "(nessuna membership)");
console.log("orgId dei corsi:", found.map((f) => `${f.key}=${f.orgId}`).join(", "));
process.exit(0);
