// Test puri Modulo 10: builder PDF (bytes validi + QR) e allowlist staff piattaforma.

import { describe, it, expect, beforeEach } from "vitest";
import { buildCertificatePdf } from "../features/certificates/pdf";
import { isPlatformStaffEmail } from "../features/auth/guards";
import { codiceFiscaleValido, validaAnagrafica } from "../features/certificates/anagrafica";
import {
  destinatarioCommittente, mailProvvisorioUtente, mailProvvisorioCommittente, mailAccreditatoUtente, nomeFileCertificato,
} from "../features/certificates/notifiche";

describe("buildCertificatePdf", () => {
  it("produce un PDF valido e non banale (QR embeddato)", async () => {
    const bytes = await buildCertificatePdf({
      learnerName: "Mario Rossi",
      courseTitle: "Sicurezza base",
      issuedAt: new Date("2026-06-21T10:00:00Z"),
      number: "EVALIS-2026-ABCD1234",
      verifyUrl: "https://example.test/verify/abcd",
    });
    const header = Buffer.from(bytes.slice(0, 5)).toString("latin1");
    expect(header).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1500); // contiene il QR come immagine
  });
});

describe("isPlatformStaffEmail", () => {
  beforeEach(() => {
    process.env.PLATFORM_STAFF_EMAILS = "Staff@Evalis.it, altro@evalis.it";
  });

  it("riconosce lo staff (case-insensitive) e rifiuta il resto", () => {
    expect(isPlatformStaffEmail("staff@evalis.it")).toBe(true);
    expect(isPlatformStaffEmail("  STAFF@evalis.it ")).toBe(true);
    expect(isPlatformStaffEmail("intruso@evalis.it")).toBe(false);
  });

  it("vuoto/non configurato → false", () => {
    process.env.PLATFORM_STAFF_EMAILS = "";
    expect(isPlatformStaffEmail("staff@evalis.it")).toBe(false);
  });
});

describe("certificato provvisorio e mail", () => {
  const dati = {
    learnerName: "Mario <b>Rossi</b>",
    learnerEmail: "mario@example.test",
    courseTitle: "Lead Auditor ISO 9001",
    requiredMinutes: 2400,
    completatoIl: new Date("2026-10-02T10:00:00Z"),
    number: "EVALIS-2026-ABCD1234",
    verifyUrl: "https://example.test/verify/abcd",
    punteggio: 87,
    codiceFiscale: "RSSMRA80A01H501U",
    dataNascita: "1980-01-01",
    luogoNascita: "Roma",
  };

  it("il PDF provvisorio è un PDF vero, diverso dal definitivo", async () => {
    const base = { learnerName: "Mario Rossi", courseTitle: "Corso", issuedAt: new Date(), number: "EVALIS-2026-ABCD1234", verifyUrl: "https://example.test/verify/abcd" };
    const prov = await buildCertificatePdf({ ...base, provvisorio: true });
    const def = await buildCertificatePdf(base);
    expect(Buffer.from(prov.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    expect(Buffer.from(prov).equals(Buffer.from(def))).toBe(false);
  });

  it("il committente riceve SOLO dalla produzione vera", () => {
    expect(destinatarioCommittente({ VERCEL_ENV: "production" })).toEqual(["evaliscert@libero.it", "dilonardoa28@gmail.com"]);
    expect(destinatarioCommittente({ VERCEL_ENV: "preview" })).toBeNull();
    expect(destinatarioCommittente({})).toBeNull();
  });

  it("mail all'utente: provvisorio, 5 giorni lavorativi, valori escapati", () => {
    const { subject, html } = mailProvvisorioUtente(dati, "https://evalisacademy.it");
    expect(subject).toContain("provvisorio");
    expect(html).toContain("5 giorni lavorativi");
    expect(html).toContain("EVALIS-2026-ABCD1234");
    expect(html).not.toContain("<b>Rossi</b>");
  });

  it("mail al committente: tutti i dati per preparare l'accreditato", () => {
    const { html } = mailProvvisorioCommittente(dati, "https://evalisacademy.it");
    for (const s of ["mario@example.test", "Lead Auditor ISO 9001", "40 ore", "87/100", "EVALIS-2026-ABCD1234", "/staff/certificati?q=EVALIS-2026-ABCD1234", "RSSMRA80A01H501U", "1 gennaio 1980", "Roma"]) {
      expect(html).toContain(s);
    }
    expect(html).not.toContain("<b>Rossi</b>");
  });

  it("mail dell'accreditato: primo invio e sostituzione", () => {
    expect(mailAccreditatoUtente(dati, "https://x", false).subject).toContain("accreditato");
    expect(mailAccreditatoUtente(dati, "https://x", true).subject).toContain("aggiornato");
    expect(nomeFileCertificato("EVALIS-2026-ABCD1234", true)).toBe("Certificato-provvisorio-EVALIS-2026-ABCD1234.pdf");
  });
});

describe("dati per il certificato", () => {
  it("codice fiscale: formato e carattere di controllo, anche con omocodia", () => {
    expect(codiceFiscaleValido("RSSMRA80A01H501U")).toBe(true);
    expect(codiceFiscaleValido("RSSMRA80A01H501X")).toBe(false); // carattere di controllo sbagliato
    expect(codiceFiscaleValido("RSSMRA80A01H5O1U")).toBe(false); // lettera O al posto dello zero
    expect(codiceFiscaleValido("RSSMRA80A01H50")).toBe(false);
    expect(codiceFiscaleValido("RSSMRAURALMHRLMQ")).toBe(false); // omocodia piena con controllo errato
  });

  it("normalizza spazi e minuscole, controlla data e luogo", () => {
    const oggi = new Date("2026-10-05T12:00:00Z");
    expect(validaAnagrafica({ codiceFiscale: " rssmra80a01h501u ", dataNascita: "1980-01-01", luogoNascita: "  Roma  " }, oggi)).toEqual({
      ok: true,
      dati: { codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Roma" },
    });
    const base = { codiceFiscale: "RSSMRA80A01H501U", dataNascita: "1980-01-01", luogoNascita: "Roma" };
    expect(validaAnagrafica({ ...base, dataNascita: "1980-02-30" }, oggi).ok).toBe(false); // data inesistente
    expect(validaAnagrafica({ ...base, dataNascita: "2020-01-01" }, oggi).ok).toBe(false); // meno di 14 anni
    expect(validaAnagrafica({ ...base, dataNascita: "1899-12-31" }, oggi).ok).toBe(false);
    expect(validaAnagrafica({ ...base, dataNascita: "01/01/1980" }, oggi).ok).toBe(false);
    expect(validaAnagrafica({ ...base, luogoNascita: "R" }, oggi).ok).toBe(false);
    expect(validaAnagrafica({ ...base, codiceFiscale: "" }, oggi).ok).toBe(false);
  });

  it("il PDF provvisorio con luogo e data di nascita resta un PDF valido", async () => {
    const pdf = await buildCertificatePdf({
      learnerName: "Mario Rossi", courseTitle: "Corso", issuedAt: new Date(), number: "EVALIS-2026-ABCD1234",
      verifyUrl: "https://example.test/verify/abcd", provvisorio: true, nascita: "nato/a a Roma il 1 gennaio 1980",
    });
    expect(Buffer.from(pdf.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });
});
