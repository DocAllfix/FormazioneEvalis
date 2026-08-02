// E2E del bivio azienda: crea un account (via API prod → no hang headless), lo verifica in DB,
// fa login via UI, apre onboarding, sceglie "Per la mia azienda", crea lo spazio e verifica il
// REDIRECT AL SOTTODOMINIO + che l'org esista con lo slug giusto. Poi CANCELLA i dati di test.
import "dotenv/config";
import { chromium } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, organization } from "@/lib/db/schema";

const BASE = "https://evalisacademy.it";
const stamp = Date.now().toString().slice(-7);
const email = `qa-fork-${stamp}@evalisacademy.it`;
const password = `QaFork!${stamp}Zx`;
const slug = `qatest${stamp}`;
let ok = false;

try {
  // 1) signup via API prod (better-auth reale)
  const su = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE }, // Origin: passa il check trustedOrigins
    body: JSON.stringify({ email, password, name: "QA Fork" }),
  });
  console.log("signup HTTP", su.status);

  // 2) verifica email in DB (salta il click sul link)
  await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));
  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (!u) throw new Error("utente non creato dalla signup");
  console.log("utente creato + verificato:", u.id);

  // 3) login via UI + bivio
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on("console", (m) => m.type() === "error" && console.log("  [console error]", m.text().slice(0, 120)));

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/onboarding|dashboard|corsi|admin/, { timeout: 25000 }).catch(() => {});
  console.log("dopo login:", page.url());

  await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  // bivio
  await page.getByText("Per la mia azienda", { exact: false }).click({ timeout: 15000 });
  console.log("cliccato 'Per la mia azienda'");
  // form azienda
  await page.fill("#ob-company-name", "QA Test Co");
  await page.fill("#ob-company-slug", slug);
  await page.click('button[type="submit"]');

  // 4) verifica redirect al SOTTODOMINIO
  await page.waitForURL(new RegExp(`${slug}\\.evalisacademy\\.it`), { timeout: 40000 });
  console.log("REDIRECT →", page.url());
  const onSub = page.url().includes(`${slug}.evalisacademy.it`);

  // 5) verifica org in DB
  const [org] = await db.select({ slug: organization.slug, name: organization.name, metadata: organization.metadata })
    .from(organization).where(eq(organization.slug, slug)).limit(1);
  console.log("org in DB:", org ? `${org.name} (${org.slug})` : "NON trovata");

  ok = onSub && !!org && page.url().includes("/admin");
  console.log(`\n=== ESITO: ${ok ? "✅ PASS" : "❌ FAIL"} (sottodominio=${onSub}, org=${!!org}, admin=${page.url().includes("/admin")}) ===`);
  await b.close();
} finally {
  // 6) CLEANUP: cancella org di test + utente di test (activity_log resta, no FK)
  await db.delete(organization).where(eq(organization.slug, slug)).catch(() => {});
  await db.delete(user).where(eq(user.email, email)).catch(() => {});
  console.log("cleanup fatto (org + utente di test rimossi)");
}
process.exit(ok ? 0 : 1);
