// Test LOCALE del flusso invito inline: crea un invito pending, apre la pagina di accettazione,
// compila il form (nome+password), verifica che l'account sia creato+verificato e diventi membro.
// Poi pulisce. Richiede il dev server su localhost:3000.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitation, user, member } from "@/lib/db/schema";

const BASE = "http://localhost:3000";
const ORG = "8804070c-d00b-41ee-a046-ea15af6343e2"; // acme-test
const INVITER = "gJJGq3cwwg7LvgGi2f5EfdvjZYNRwpSu"; // owner acme-test
const stamp = Date.now().toString().slice(-7);
const email = `qa-invite-${stamp}@example.com`;
const invId = randomUUID();
let ok = false;

try {
  await db.insert(invitation).values({
    id: invId, organizationId: ORG, email, role: "member", status: "pending",
    expiresAt: new Date(Date.now() + 7 * 864e5), inviterId: INVITER,
  });
  console.log("invito pending creato:", invId, "→", email);

  const b = await chromium.launch();
  const page = await (await b.newContext()).newPage();
  page.on("console", (m) => m.type() === "error" && console.log("  [console err]", m.text().slice(0, 140)));
  await page.goto(`${BASE}/accept-invitation/${invId}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#inv-name", { timeout: 25000 }).catch(() => {});
  const diag0 = await page.evaluate(() => ({
    url: location.href,
    hasForm: !!document.querySelector("#inv-name"),
    bodyHint: document.body.innerText.slice(0, 120),
  }));
  console.log("DIAG pagina:", JSON.stringify(diag0));
  await page.fill("#inv-name", "QA Invitato", { timeout: 20000 });
  await page.fill("#inv-password", `QaInv!${stamp}Zx`);
  const diag1 = await page.evaluate(() => ({
    name: (document.querySelector("#inv-name") as HTMLInputElement)?.value,
    pwLen: (document.querySelector("#inv-password") as HTMLInputElement)?.value.length,
    btnDisabled: (document.querySelector('button[type="submit"]') as HTMLButtonElement)?.disabled,
  }));
  console.log("DIAG dopo fill:", JSON.stringify(diag1));
  await page.click('button[type="submit"]', { timeout: 8000 }).catch((e) => console.log("click fallito:", String(e).slice(0, 80)));
  await page.waitForURL(/dashboard|onboarding|corsi/, { timeout: 40000 }).catch(() => {});
  console.log("dopo submit URL:", page.url());
  await b.close();

  const [u] = await db.select({ id: user.id, ver: user.emailVerified }).from(user).where(eq(user.email, email)).limit(1);
  const isMember = u
    ? (await db.select({ id: member.id }).from(member).where(and(eq(member.userId, u.id), eq(member.organizationId, ORG))).limit(1)).length > 0
    : false;
  console.log(`account creato: ${!!u} | verificato: ${u?.ver} | membro acme-test: ${isMember}`);
  ok = !!u && !!u.ver && isMember;
  console.log(`\n=== ESITO: ${ok ? "✅ PASS" : "❌ FAIL"} ===`);
} finally {
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (u) {
    await db.delete(member).where(eq(member.userId, u.id)).catch(() => {});
    await db.delete(user).where(eq(user.id, u.id)).catch(() => {});
  }
  await db.delete(invitation).where(eq(invitation.id, invId)).catch(() => {});
  console.log("cleanup fatto");
}
process.exit(ok ? 0 : 1);
