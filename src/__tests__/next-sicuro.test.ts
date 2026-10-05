// Test puro del parametro `next` (ritorno dopo login/registrazione) e della scadenza del
// prezzo di lancio. Il `next` arriva dall'URL: senza validazione diventa un redirect verso
// un sito esterno. Nessuna rete/DB.

import { describe, it, expect } from "vitest";
import { pathInterno, registratiPer } from "../lib/next-sicuro";
import { hasLaunchPrice } from "../components/catalog/prezzo-corso";
import { fineLancio } from "../features/billing/listino-dati";

describe("pathInterno — accetta i percorsi interni", () => {
  it.each([
    "/corsi/9c1d2e3f",
    "/corsi#pacchetto-qualita",
    "/onboarding?next=%2Fcorsi%2Fabc",
    "/accept-invitation/xyz",
  ])("%s", (p) => {
    expect(pathInterno(p)).toBe(p);
  });
});

describe("pathInterno — rifiuta tutto il resto (open redirect)", () => {
  it.each([
    ["vuoto", ""],
    ["null", null],
    ["undefined", undefined],
    ["protocol-relative", "//evil.com"],
    ["backslash: i browser lo leggono come //", "/\\evil.com"],
    ["assoluto https", "https://evil.com"],
    ["assoluto dentro un path", "/x?u=https://evil.com"],
    ["relativo senza slash", "evil.com"],
    ["tabulazione: il parser la toglie e resta //", "/\t/evil.com"],
    ["a capo: idem", "/\n/evil.com"],
  ])("%s", (_nome, raw) => {
    expect(pathInterno(raw as string | null | undefined)).toBe("/dashboard");
  });

  it("usa il fallback indicato", () => {
    expect(pathInterno("//evil.com", "")).toBe("");
  });
});

describe("registratiPer", () => {
  it("codifica la destinazione, ancora compresa, e torna indietro identica", () => {
    const href = registratiPer("/corsi#pacchetto-qualita");
    expect(href).toBe("/registrati?next=%2Fcorsi%23pacchetto-qualita");
    const next = new URL(href, "https://x.it").searchParams.get("next");
    expect(pathInterno(next)).toBe("/corsi#pacchetto-qualita");
  });
});

describe("hasLaunchPrice", () => {
  it("vero solo se il listino supera il prezzo attuale", () => {
    expect(hasLaunchPrice({ priceCents: 49900, listPriceCents: 64900 })).toBe(true);
    expect(hasLaunchPrice({ priceCents: 34900, listPriceCents: 34900 })).toBe(false);
    expect(hasLaunchPrice({ priceCents: 49900, listPriceCents: null })).toBe(false);
    expect(hasLaunchPrice({ priceCents: null, listPriceCents: 64900 })).toBe(false);
  });
});

describe("fineLancio", () => {
  const iso = (t: number) => new Date(t).toISOString();
  it("rinnova l'offerta all'ultimo giorno del mese in corso, 23:59:59 ora di Roma", () => {
    // ottobre: il 31 l'ora legale è già finita (CET, +01:00)
    expect(iso(fineLancio(Date.parse("2026-10-05T12:00:00Z")))).toBe("2026-10-31T22:59:59.000Z");
    // passata la scadenza riparte sul mese dopo: novembre ha 30 giorni
    expect(iso(fineLancio(Date.parse("2026-10-31T23:00:00Z")))).toBe("2026-11-30T22:59:59.000Z");
    expect(iso(fineLancio(Date.parse("2027-02-10T08:00:00Z")))).toBe("2027-02-28T22:59:59.000Z");
    // marzo: a fine mese è ora legale (CEST, +02:00)
    expect(iso(fineLancio(Date.parse("2027-03-15T08:00:00Z")))).toBe("2027-03-31T21:59:59.000Z");
  });
});
