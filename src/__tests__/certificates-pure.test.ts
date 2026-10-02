// Test puri Modulo 10: builder PDF (bytes validi + QR) e allowlist staff piattaforma.

import { describe, it, expect, beforeEach } from "vitest";
import { buildCertificatePdf } from "../features/certificates/pdf";
import { isPlatformStaffEmail } from "../features/auth/guards";
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
  };

  it("il PDF provvisorio è un PDF vero, diverso dal definitivo", async () => {
    const base = { learnerName: "Mario Rossi", courseTitle: "Corso", issuedAt: new Date(), number: "EVALIS-2026-ABCD1234", verifyUrl: "https://example.test/verify/abcd" };
    const prov = await buildCertificatePdf({ ...base, provvisorio: true });
    const def = await buildCertificatePdf(base);
    expect(Buffer.from(prov.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    expect(Buffer.from(prov).equals(Buffer.from(def))).toBe(false);
  });

  it("il committente riceve SOLO dalla produzione vera", () => {
    expect(destinatarioCommittente({ VERCEL_ENV: "production" })).toBe("evaliscert@libero.it");
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
    for (const s of ["mario@example.test", "Lead Auditor ISO 9001", "40 ore", "87/100", "EVALIS-2026-ABCD1234", "/staff/certificati?q=EVALIS-2026-ABCD1234"]) {
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
