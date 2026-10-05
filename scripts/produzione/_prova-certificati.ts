// Collaudo COMPLETO dei certificati sul DB di SVILUPPO e sull'app locale (porta 3100), con uno
// screenshot per ogni passaggio in produzione/_qa-playwright/_certificati/:
//   fine corso col provvisorio → pagina Certificati → verifica per numero (anche dalla landing) →
//   staff cerca e carica l'accreditato → l'utente scarica l'accreditato → verifica "valido".
// Le mail vere partono SOLO verso l'indirizzo passato con --mail (l'utente di prova); la mail del
// committente fuori produzione non parte (resta nel log del server). Rifiuta il DB di produzione.
// Uso: npx tsx scripts/produzione/_prova-certificati.ts --mail <email-di-prova>
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Page } from "@playwright/test";
import postgres from "postgres";
import { PDFDocument, StandardFonts } from "pdf-lib";

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === process.env.PROD_DATABASE_URL) {
  console.error("Serve il DB di SVILUPPO: fermo.");
  process.exit(1);
}
const args = process.argv.slice(2);
const MAIL = args[args.indexOf("--mail") + 1];
if (!args.includes("--mail") || !MAIL?.includes("@")) {
  console.error("Uso: --mail <email-di-prova>");
  process.exit(1);
}
const BASE = "http://localhost:3100";
const OUT = "produzione/_qa-playwright/_certificati";
mkdirSync(OUT, { recursive: true });
const PW = "Password123!";
const ok = (m: string) => console.log(`OK  ${m}`);
const ko = (m: string) => { console.log(`KO  ${m}`); process.exitCode = 1; };

const { ingestCourse } = await import("@/features/courses/ingest");
const { sampleCourse } = await import("@/features/courses/seed");
const { recordHeartbeat } = await import("@/features/tracking/progress");
const { startQuiz, submitQuiz } = await import("@/features/quiz/engine");

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
await sql`DELETE FROM rate_limit WHERE "key" LIKE 'auth:%' OR "key" LIKE 'verifica:%'`;

// --- dati di prova: corso breve, utente che lo completa, utente staff ---
const { courseId } = await ingestCourse(sampleCourse());
await sql`UPDATE course SET title = 'Corso di prova certificati' WHERE id = ${courseId}`;
const b = await chromium.launch();
async function utente(email: string, nome: string): Promise<{ id: string; page: Page }> {
  const ctx = await b.newContext({ locale: "it-IT", viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("evalis-consenso-cookie", JSON.stringify({ necessari: true, statistiche: false, quando: new Date().toISOString(), versione: 2 })); } catch {}
  });
  const page = await ctx.newPage();
  const r = await page.request.post(`${BASE}/api/auth/sign-up/email`, { data: { name: nome, email, password: PW } });
  if (!r.ok()) throw new Error(`registrazione ${email}: ${r.status()}`);
  await sql`UPDATE "user" SET email_verified = true WHERE email = ${email}`;
  const l = await page.request.post(`${BASE}/api/auth/sign-in/email`, { data: { email, password: PW } });
  if (!l.ok()) throw new Error(`accesso ${email}: ${l.status()}`);
  const [u] = await sql`SELECT id FROM "user" WHERE email = ${email}`;
  return { id: u.id, page };
}
async function senzaOnboarding(p: Page, url: string) {
  await p.goto(url, { waitUntil: "networkidle", timeout: 240000 });
  const salta = p.getByRole("button", { name: "Salta" });
  if (await salta.isVisible().catch(() => false)) {
    await salta.click();
    await p.waitForURL(/dashboard/, { timeout: 60000 });
    await p.goto(url, { waitUntil: "networkidle", timeout: 240000 });
  }
}
const scatta = (p: Page, nome: string) => p.screenshot({ path: `${OUT}/${nome}.png`, fullPage: true });

const tag = Date.now();
const studente = await utente(MAIL.replace("@", `+cert${tag}@`), "Mario Rossi");
const staff = await utente(`staff-cert+${tag}@evalis.test`, "Staff Prova");
await sql`UPDATE "user" SET platform_role = 'admin' WHERE id = ${staff.id}`;
const [m] = await sql`SELECT organization_id FROM member WHERE user_id = ${studente.id} AND role = 'owner' LIMIT 1`;
const [enr] = await sql`INSERT INTO enrollment (organization_id, user_id, course_id, source, status) VALUES (${m.organization_id}, ${studente.id}, ${courseId}, 'manual', 'active') RETURNING id`;
ok(`dati di prova pronti (studente ${MAIL.replace("@", `+cert${tag}@`)})`);

// slide e quiz intermedi completati lato server; l'ESAME FINALE si fa nel browser
const ctx = { userId: studente.id };
const slides = await sql`SELECT s.id, s.audio_seconds FROM slide s JOIN lesson l ON l.id = s.lesson_id JOIN module mo ON mo.id = l.module_id WHERE mo.course_id = ${courseId} ORDER BY s.position`;
for (const s of slides) {
  let t = Date.now(), pos = 0;
  await recordHeartbeat({ enrollmentId: enr.id, slideId: s.id, position: 0, focus: true, playing: true, nowMs: t, ctx });
  while (pos < s.audio_seconds) {
    const step = Math.min(12, s.audio_seconds - pos);
    pos += step; t += step * 1000;
    await recordHeartbeat({ enrollmentId: enr.id, slideId: s.id, position: pos, focus: true, playing: true, audioCompleted: pos >= s.audio_seconds, nowMs: t, ctx });
  }
}
const quizzes = await sql`SELECT id, type FROM quiz WHERE course_id = ${courseId}`;
const corrette = async (quizId: string) => new Map((await sql`SELECT id, correct_option_id, options FROM quiz_question WHERE quiz_id = ${quizId}`).map((q) => [q.id, q]));
for (const q of quizzes.filter((x) => x.type !== "final")) {
  const st = await startQuiz(enr.id, q.id, ctx);
  const map = await corrette(q.id);
  await submitQuiz(st.attemptId, st.questions.map((d) => ({ questionId: d.id, optionId: map.get(d.id)!.correct_option_id })), ctx);
}
const finale = quizzes.find((x) => x.type === "final")!;
const risposte = await corrette(finale.id);
ok("slide e quiz intermedi completati");

// --- 1. esame finale nel browser → schermata di fine corso col provvisorio ---
const P = studente.page;
await senzaOnboarding(P, `${BASE}/corso/${enr.id}`);
for (let i = 0; i < 20 && !(await P.getByRole("button", { name: "Inizia l'esame" }).isVisible().catch(() => false)); i++) {
  const avanti = P.getByRole("button", { name: /Avanti|Continua/ }).last();
  if (await avanti.isEnabled().catch(() => false)) await avanti.click(); else break;
  await P.waitForTimeout(400);
}
// prima dell'esame: il modulo dei dati per il certificato (obbligatorio)
await P.getByLabel("Codice fiscale").waitFor({ timeout: 60000 });
(await P.getByRole("button", { name: "Inizia l'esame" }).isVisible()) ? ko("esame avviabile senza dati") : ok("esame bloccato finché mancano i dati per il certificato");
await scatta(P, "00-dati-prima-esame");
await P.getByLabel("Codice fiscale").fill("RSSMRA80A01H501X"); // sbagliato apposta
await P.getByLabel("Data di nascita").fill("1980-01-01");
await P.getByLabel("Luogo di nascita").fill("Roma");
await P.getByRole("button", { name: "Salva e continua" }).click();
await P.getByText("Il codice fiscale non è valido").waitFor({ timeout: 120000 });
ok("codice fiscale sbagliato: rifiutato con messaggio chiaro");
await P.getByLabel("Codice fiscale").fill("rssmra80a01h501u");
await P.getByRole("button", { name: "Salva e continua" }).click();
await P.getByRole("button", { name: "Inizia l'esame" }).waitFor({ timeout: 120000 });
ok("dati salvati: l'esame si può iniziare");
await P.getByRole("button", { name: "Inizia l'esame" }).click();
await P.locator("li:has(input[type=radio])").first().waitFor({ timeout: 30000 });
for (const li of await P.locator("li:has(input[type=radio])").all()) {
  const qid = await li.locator("input[type=radio]").first().getAttribute("name");
  const q = risposte.get(qid!)!;
  const giusta = (q.options as { id: string; text: string }[]).find((o) => o.id === q.correct_option_id)!.text;
  await li.locator("label", { hasText: giusta }).first().click();
}
await P.getByRole("button", { name: "Invia risposte" }).click();
await P.getByRole("heading", { name: "Corso completato" }).waitFor({ timeout: 60000 });
const bottone = P.getByRole("link", { name: "Scarica il certificato provvisorio" });
(await bottone.isVisible()) ? ok("fine corso: pulsante del certificato provvisorio") : ko("fine corso senza provvisorio");
(await P.getByText("5 giorni lavorativi").isVisible()) ? ok("fine corso: frase dei 5 giorni lavorativi") : ko("manca la frase dei 5 giorni");
await scatta(P, "01-fine-corso");

const [cert] = await sql`SELECT id, number, verify_uuid, status FROM certificate WHERE enrollment_id = ${enr.id}`;
cert?.status === "ready_for_review" && /^EVALIS-\d{4}-[0-9A-F]{8}$/.test(cert.number) ? ok(`certificato provvisorio ${cert.number}`) : ko("certificato non creato");

// il PDF provvisorio
const pdf = await P.request.get(`${BASE}/api/certificato/${cert.id}`);
const pdfBytes = await pdf.body();
pdf.headers()["content-type"] === "application/pdf" && pdfBytes.subarray(0, 5).toString() === "%PDF-" ? ok("download del provvisorio: PDF") : ko(`download provvisorio: ${pdf.status()}`);
writeFileSync(`${OUT}/certificato-provvisorio.pdf`, pdfBytes);

// i dati arrivano nel provvisorio
const { PDFDocument: Lettore } = await import("pdf-lib");
await Lettore.load(pdfBytes); // PDF valido
const [ana] = await sql`SELECT codice_fiscale, luogo_nascita FROM anagrafica_certificato WHERE user_id = ${studente.id}`;
ana?.codice_fiscale === "RSSMRA80A01H501U" && ana?.luogo_nascita === "Roma" ? ok("dati per il certificato salvati (CF in maiuscolo)") : ko("dati per il certificato non salvati");

// --- 2. pagina Certificati ---
await senzaOnboarding(P, `${BASE}/certificati`);
(await P.getByText("Provvisorio", { exact: true }).isVisible()) ? ok("Certificati: stato Provvisorio") : ko("Certificati: stato sbagliato");
await scatta(P, "02-certificati-provvisorio");

// profilo: i dati ci sono e ora sono bloccati
await P.goto(`${BASE}/profilo#dati-certificato`, { waitUntil: "networkidle" });
(await P.getByText("già stati usati per il tuo certificato").isVisible()) ? ok("Profilo: dati bloccati dopo il certificato") : ko("Profilo: dati non bloccati");
await scatta(P, "02b-profilo-dati");

// --- 3. verifica: per numero e dalla landing ---
const anonimo = await (await b.newContext({ locale: "it-IT" })).newPage();
await anonimo.goto(`${BASE}/verify/${cert.number}`, { waitUntil: "networkidle" });
(await anonimo.getByText("Completamento verificato").isVisible()) ? ok("verifica per numero: provvisorio") : ko("verifica per numero");
await scatta(anonimo, "03-verifica-provvisorio");
await anonimo.goto(`${BASE}/#verifica`, { waitUntil: "networkidle" });
await anonimo.getByLabel("Codice del certificato").fill(cert.number.toLowerCase());
await anonimo.locator("#verifica").getByRole("button", { name: "Verifica" }).click();
await anonimo.getByText("Completamento verificato").waitFor({ timeout: 60000 });
ok("verifica dalla landing (numero in minuscolo)");
const rotta = await anonimo.request.get(`${BASE}/verify/EVALIS-2026-ABCD1234`);
rotta.status() === 200 ? ok("codice inesistente: 200 'non trovato' (non più 500)") : ko(`codice inesistente: ${rotta.status()}`);

// --- 4. staff: cerca per numero e carica l'accreditato ---
const S = staff.page;
await senzaOnboarding(S, `${BASE}/staff/certificati?q=${cert.number}`);
await S.getByText(cert.number).first().waitFor({ timeout: 60000 });
(await S.getByText("CF RSSMRA80A01H501U").isVisible()) ? ok("console staff: codice fiscale e nascita visibili") : ko("console staff: dati mancanti");
await scatta(S, "04-staff-ricerca");
const doc = await PDFDocument.create();
const pg = doc.addPage([842, 595]);
pg.drawText("CERTIFICATO ACCREDITATO DI PROVA", { x: 180, y: 300, size: 26, font: await doc.embedFont(StandardFonts.HelveticaBold) });
pg.drawText(cert.number, { x: 330, y: 260, size: 14, font: await doc.embedFont(StandardFonts.Helvetica) });
const accreditato = Buffer.from(await doc.save());
writeFileSync(`${OUT}/accreditato-di-prova.pdf`, accreditato);
const [chooser] = await Promise.all([S.waitForEvent("filechooser"), S.getByRole("button", { name: "Carica accreditato" }).click()]);
await chooser.setFiles(`${OUT}/accreditato-di-prova.pdf`);
await S.getByText("caricato: l'utente lo trova").waitFor({ timeout: 90000 });
ok("staff: certificato accreditato caricato");
await scatta(S, "05-staff-caricato");

// --- 5. l'utente vede e scarica l'accreditato ---
await P.goto(`${BASE}/certificati`, { waitUntil: "networkidle" });
(await P.getByText("Accreditato", { exact: true }).isVisible()) ? ok("Certificati: stato Accreditato") : ko("Certificati: non accreditato");
await scatta(P, "06-certificati-accreditato");
const fin = await P.request.get(`${BASE}/api/certificato/${cert.id}`);
Buffer.from(await fin.body()).equals(accreditato) ? ok("download: è esattamente il file caricato dallo staff") : ko("download: file diverso");

// --- 6. verifica: valido ---
await anonimo.goto(`${BASE}/verify/${cert.verify_uuid}`, { waitUntil: "networkidle" });
(await anonimo.getByText("Certificato valido").isVisible()) ? ok("verifica per QR: valido") : ko("verifica: non valido");
await scatta(anonimo, "07-verifica-valido");

await b.close();
await sql.end();
console.log(process.exitCode ? "\nCOLLAUDO FALLITO" : `\nCOLLAUDO COMPLETO · certificato ${cert.number}`);
process.exit();
