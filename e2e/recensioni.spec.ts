// Recensioni nel browser: chi ha il certificato lascia l'opinione dalla pagina Certificati (stelle,
// testo, consenso con la forma del nome), lo staff la approva e la mette in landing dalla console,
// e l'opinione compare in «Dicono di noi» e nella scheda pubblica del corso con la media; ritirato
// il consenso sparisce. Le regole sono provate a fondo in src/__tests__/recensioni.db.test.ts.
// Certificato e altre due opinioni (per arrivare alle soglie di 3) si seminano nel DB di sviluppo.

import "dotenv/config";
import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { login, registraVerificaLogin, seminaCorsoEIscrivi, tracciaErroriConsole } from "./helpers";

const DB = process.env.DATABASE_URL!;
const corsi: string[] = [];
const utenti: string[] = []; // solo gli utenti seminati qui (quelli registrati restano, come negli altri e2e)
const staffDaRipristinare: string[] = [];

test.afterAll(async () => {
  const sql = postgres(DB, { prepare: false, max: 1 });
  try {
    if (corsi.length) await sql`DELETE FROM course WHERE id IN ${sql(corsi)}`; // cascade iscrizioni, certificati, recensioni
    if (utenti.length) await sql`DELETE FROM "user" WHERE id IN ${sql(utenti)}`;
    if (staffDaRipristinare.length) await sql`UPDATE "user" SET platform_role = NULL WHERE email IN ${sql(staffDaRipristinare)}`;
  } finally {
    await sql.end();
  }
});

test("opinione → approvazione dello staff → landing e scheda del corso → consenso ritirato", async ({ browser }) => {
  test.setTimeout(240_000);
  const errori: string[] = [];

  // corsista con il certificato del corso
  const corsista = await browser.newPage();
  corsista.on("console", tracciaErroriConsole(errori));
  const { email } = await registraVerificaLogin(corsista, "giulia bianchi");
  const { enrollmentId, courseId } = await seminaCorsoEIscrivi(email);
  corsi.push(courseId);
  const slug = `e2e-recensioni-${Date.now()}`;
  const sql = postgres(DB, { prepare: false, max: 1 });
  try {
    await sql`UPDATE course SET slug = ${slug} WHERE id = ${courseId}`;
    await sql`INSERT INTO certificate (enrollment_id, status, number) VALUES (${enrollmentId}, 'ready_for_review', ${`E2E-${Date.now()}`})`;
    // altre due opinioni già approvate e in landing, per arrivare alle soglie (3 in landing, 3 voti)
    const [m] = await sql`SELECT organization_id FROM enrollment WHERE id = ${enrollmentId}`;
    for (const [i, voto] of [4, 5].entries()) {
      const id = `e2e-rec-${Date.now()}-${i}`;
      utenti.push(id);
      await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES (${id}, ${`Altro ${i}`}, ${`${id}@evalis.test`}, true, now(), now())`;
      const [e] = await sql`INSERT INTO enrollment (organization_id, user_id, course_id, source, status) VALUES (${m.organization_id}, ${id}, ${courseId}, 'manual', 'active') RETURNING id`;
      await sql`INSERT INTO course_review (enrollment_id, user_id, course_id, voto_corso, voto_piattaforma, testo, pubblicazione, nome_pubblico, consenso_il, consenso_versione, stato, in_evidenza)
        VALUES (${e.id}, ${id}, ${courseId}, ${voto}, ${voto}, ${`Opinione di prova ${i}`}, 'nome_iniziale', ${`Altro ${i}`}, now(), 1, 'approvata', true)`;
    }
  } finally {
    await sql.end();
  }

  await corsista.goto("/certificati");
  await corsista.getByRole("button", { name: "Lascia la tua opinione" }).click();
  await corsista.getByRole("radiogroup", { name: "Il corso" }).getByRole("radio", { name: "5 stelle" }).click();
  await corsista.getByRole("radiogroup", { name: "La piattaforma" }).getByRole("radio", { name: "4 stelle" }).click();
  await corsista.getByLabel(/La tua opinione/).fill("Spiegazioni chiare e casi pratici utili.");
  await corsista.getByRole("checkbox").check();
  // la forma proposta è nome e iniziale, con l'anteprima del nome vero
  await expect(corsista.getByRole("radio", { name: /Giulia B\./ })).toBeChecked();
  await corsista.getByRole("button", { name: "Invia la tua opinione" }).click();
  await expect(corsista.getByText("Grazie per la tua opinione.")).toBeVisible();
  await corsista.reload();
  await expect(corsista.getByText("In attesa di verifica dello staff")).toBeVisible();

  // non approvata: sulla scheda pubblica non c'è ancora
  const pubblico = await browser.newPage();
  await pubblico.goto(`/catalogo/${slug}`);
  await expect(pubblico.getByText("Spiegazioni chiare e casi pratici utili.")).toHaveCount(0);

  // staff: approva e mette in landing
  const staff = await browser.newPage();
  const { email: emailStaff } = await registraVerificaLogin(staff, "Staff Recensioni");
  const sql2 = postgres(DB, { prepare: false, max: 1 });
  try {
    await sql2`UPDATE "user" SET platform_role = 'admin' WHERE email = ${emailStaff}`;
    staffDaRipristinare.push(emailStaff);
  } finally {
    await sql2.end();
  }
  // il ruolo nuovo vale da un accesso nuovo
  await staff.context().clearCookies();
  await login(staff, emailStaff, undefined, "/staff/recensioni");
  await staff.goto("/staff/recensioni");
  const scheda = staff.locator("li", { hasText: "Spiegazioni chiare e casi pratici utili." });
  await expect(scheda).toContainText("Giulia B.");
  await scheda.getByRole("button", { name: "Approva e metti in landing" }).click();
  await expect(staff.locator("li", { hasText: "Spiegazioni chiare e casi pratici utili." })).toHaveCount(0); // uscita da «da approvare»

  // sito: landing e scheda del corso
  await pubblico.goto("/");
  const sezione = pubblico.locator("section", { has: pubblico.getByRole("heading", { name: "Le parole di chi ha completato il percorso" }) });
  await expect(sezione).toBeVisible();
  await expect(sezione.getByText("«Spiegazioni chiare e casi pratici utili.»").first()).toBeVisible();
  await expect(sezione.getByText("Giulia B.").first()).toBeVisible();
  await pubblico.goto(`/catalogo/${slug}`);
  await expect(pubblico.getByText("«Spiegazioni chiare e casi pratici utili.»")).toBeVisible();
  await expect(pubblico.getByText("3 valutazioni")).toBeVisible();
  await expect(pubblico.getByText("4,7")).toBeVisible(); // (5 + 4 + 5) / 3

  // il corsista ritira il consenso: sparisce dal sito
  await corsista.goto("/certificati");
  await expect(corsista.getByText("Pubblicata sul sito come «Giulia B.»")).toBeVisible();
  await corsista.getByRole("button", { name: "Modifica" }).click();
  await corsista.getByRole("checkbox").uncheck();
  await corsista.getByRole("button", { name: "Salva le modifiche" }).click();
  await expect(corsista.getByText("La leggerà solo lo staff Evalis")).toBeVisible();
  await pubblico.goto(`/catalogo/${slug}`);
  await expect(pubblico.getByText("«Spiegazioni chiare e casi pratici utili.»")).toHaveCount(0);
  await expect(pubblico.getByText("3 valutazioni")).toBeVisible(); // il voto resta nella media

  expect(errori).toEqual([]);
});
