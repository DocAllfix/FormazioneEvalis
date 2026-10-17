import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildAttestatoEvalisPdf, CORSI_STILE_COMPLETO } from "@/features/certificates/attestato-evalis-pdf";

// L'attestato EVALIS Academy in stile completo (richiesta del 17/10/2026, oggi solo la PdR 125).

const base = {
  learnerName: "Maria Rossi",
  courseTitle: "Parità di genere UNI/PdR 125:2022",
  durataMinuti: 480,
  issuedAt: new Date("2026-10-17T10:00:00Z"),
  number: "EVALIS-2026-ABCDEF12",
  verifyUrl: "https://www.evalisacademy.it/verify/3f6c2a1e-8b7d-4c1e-9a2b-5d4e3f2a1b0c",
};

describe("attestato EVALIS in stile completo", () => {
  it("vale oggi solo per il corso PdR 125", () => {
    expect([...CORSI_STILE_COMPLETO]).toEqual(["parita-di-genere-uni-pdr-125-2022"]);
  });

  it("è un PDF vero, una pagina A4 orizzontale, col protocollo nel titolo del documento", async () => {
    const doc = await PDFDocument.load(await buildAttestatoEvalisPdf(base));
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 842, height: 595 });
    expect(doc.getTitle()).toBe(`Attestato ${base.number}`);
    expect(doc.getAuthor()).toBe("EVALIS Academy");
  });

  it("non si rompe con nomi stranieri lunghi, titoli lunghi e caratteri che il font non ha", async () => {
    const bytes = await buildAttestatoEvalisPdf({
      ...base,
      learnerName: "Bartłomiej Świątkowski-Della Valle Andreoli 测试",
      nascita: "nato/a a Reggio nell'Emilia il 29 febbraio 1984",
      courseTitle: "Parità di genere UNI/PdR 125:2022 — Sistema di gestione per la parità di genere nelle organizzazioni pubbliche e private",
      durataMinuti: 450,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });
});
