// Recensioni — regole pure: controllo dei dati, nome sul sito, chi riceve la mail allo staff.

import { describe, it, expect } from "vitest";
import { destinatariRecensioni, mailRecensioneDaApprovare, nomePubblico, validaRecensione, daApprovare } from "@/features/recensioni/regole";

const ok = { votoCorso: 5, votoPiattaforma: null, testo: "Corso chiaro", pubblicazione: "nome_iniziale" };
const errore = (f: () => unknown) => {
  try {
    f();
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

describe("validaRecensione", () => {
  it("accetta un'opinione completa e toglie gli spazi", () => {
    expect(validaRecensione({ ...ok, testo: "  Corso chiaro \r\n" })).toEqual({ ...ok, testo: "Corso chiaro" });
  });
  it("rifiuta stelle fuori da 1-5 o non intere", () => {
    for (const v of [0, 6, 3.5, "4", null, undefined]) expect(errore(() => validaRecensione({ ...ok, votoCorso: v }))).toMatch(/stelle/);
    expect(errore(() => validaRecensione({ ...ok, votoPiattaforma: 9 }))).toMatch(/piattaforma/);
  });
  it("voto della piattaforma facoltativo", () => {
    expect(validaRecensione({ votoCorso: 3 }).votoPiattaforma).toBeNull();
  });
  it("niente pubblicazione senza testo, testo al massimo 800 caratteri, forma valida", () => {
    expect(errore(() => validaRecensione({ ...ok, testo: "  " }))).toMatch(/scrivi/);
    expect(validaRecensione({ ...ok, testo: "", pubblicazione: "no" }).testo).toBe("");
    expect(errore(() => validaRecensione({ ...ok, testo: "x".repeat(801) }))).toMatch(/800/);
    expect(errore(() => validaRecensione({ ...ok, pubblicazione: "sempre" }))).toMatch(/non valida/);
  });
  it("da approvare solo con consenso e testo", () => {
    expect(daApprovare({ pubblicazione: "no", testo: "bello" })).toBe(false);
    expect(daApprovare({ pubblicazione: "nome_cognome", testo: "bello" })).toBe(true);
  });
});

describe("nomePubblico", () => {
  it("nome e iniziale, nome e cognome, nessun nome senza consenso", () => {
    expect(nomePubblico("mario  ROSSI", "nome_iniziale")).toBe("Mario R.");
    expect(nomePubblico("Maria Grazia De Luca", "nome_iniziale")).toBe("Maria L.");
    expect(nomePubblico("mario rossi", "nome_cognome")).toBe("Mario Rossi");
    expect(nomePubblico("Mario", "nome_iniziale")).toBe("Mario");
    expect(nomePubblico("Mario Rossi", "no")).toBeNull();
    expect(nomePubblico("   ", "nome_cognome")).toBeNull();
  });
});

describe("mail allo staff", () => {
  it("solo dilonardoa28@gmail.com e solo dalla produzione", () => {
    expect(destinatariRecensioni({ VERCEL_ENV: "production" })).toEqual(["dilonardoa28@gmail.com"]);
    expect(destinatariRecensioni({ VERCEL_ENV: "preview" })).toEqual([]);
    expect(destinatariRecensioni({})).toEqual([]);
  });
  it("i testi dell'utente arrivano escapati", () => {
    const m = mailRecensioneDaApprovare(
      { ...ok, pubblicazione: "nome_iniziale", testo: "<script>x</script>", autore: "<b>Mario</b>", email: "m@x.it", corso: "ISO 9001", nomePubblico: "Mario R.", modificata: false },
      "https://www.evalisacademy.it",
    );
    expect(m.body.join("")).not.toContain("<script>");
    expect(m.body.join("")).toContain("&lt;script&gt;");
    expect(m.button.url).toBe("https://www.evalisacademy.it/staff/recensioni");
  });
});

describe("mail del certificato accreditato", () => {
  it("chiede l'opinione solo quando manca", async () => {
    const { mailAccreditatoUtente, mailAttestatoEvalisUtente } = await import("@/features/certificates/notifiche");
    const d = { learnerName: "Mario", courseTitle: "ISO 9001", number: "C01" };
    expect(mailAccreditatoUtente(d, "https://x.it", false, true).html).toContain("Com'è andato il corso?");
    expect(mailAccreditatoUtente(d, "https://x.it", false).html).not.toContain("Com'è andato il corso?");
    expect(mailAttestatoEvalisUtente(d, "https://x.it", true).html).toContain("Com'è andato il corso?");
    expect(mailAttestatoEvalisUtente(d, "https://x.it").html).not.toContain("Com'è andato il corso?");
  });
});
