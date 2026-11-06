import { describe, it, expect } from "vitest";
import { PDFArray, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream, type PDFRef } from "pdf-lib";
import { buildAttestatoEvalisPdf } from "@/features/certificates/attestato-evalis-pdf";
import { MONOGRAMMA_EVALIS_PNG } from "@/features/certificates/grafica-attestato-evalis";

// L'attestato EVALIS Academy definitivo, lo stesso per tutti i corsi solo EVALIS (19/10/2026).

const base = {
  learnerName: "Maria Rossi",
  courseTitle: "Parità di genere UNI/PdR 125:2022",
  durataMinuti: 480,
  issuedAt: new Date("2026-10-17T10:00:00Z"),
  number: "EVALIS-2026-ABCDEF12",
  verifyUrl: "https://www.evalisacademy.it/verify/3f6c2a1e-8b7d-4c1e-9a2b-5d4e3f2a1b0c",
};

describe("attestato EVALIS in stile completo", () => {
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

  // qualunque PNG fa da firma di prova: la vera sta solo nello storage privato
  const firma = Buffer.from(MONOGRAMMA_EVALIS_PNG, "base64");
  const immagini = async (bytes: Uint8Array) => {
    const doc = await PDFDocument.load(bytes);
    return doc.context.enumerateIndirectObjects().filter(([, o]) => o instanceof PDFRawStream && o.dict.get(PDFName.of("Subtype")) === PDFName.of("Image")).length;
  };
  /** Gli operatori del contenuto della pagina: curve di Bézier (i cerchi) e testo mostrato (le lettere). */
  const operatori = async (bytes: Uint8Array) => {
    const doc = await PDFDocument.load(bytes);
    const c = doc.getPage(0).node.Contents();
    const flussi = c instanceof PDFArray ? c.asArray().map((r) => doc.context.lookup(r as PDFRef)) : [c];
    const t = flussi.map((s) => Buffer.from(decodePDFRawStream(s as PDFRawStream).decode()).toString("latin1")).join("\n");
    return { curve: (t.match(/\sc\n/g) ?? []).length, lettere: (t.match(/Tj/g) ?? []).length };
  };

  it("la firma compare solo se è passata (la riconsegna degli attestati emessi prima)", async () => {
    expect(await immagini(await buildAttestatoEvalisPdf({ ...base, firma }))).toBeGreaterThan(await immagini(await buildAttestatoEvalisPdf(base)));
  });

  it("senza firma il definitivo porta il timbro EVALIS Academy: due cerchi e 13 lettere in più, nessuna immagine in più", async () => {
    const timbro = await buildAttestatoEvalisPdf(base);
    const firmato = await buildAttestatoEvalisPdf({ ...base, firma });
    // «EVALIS» (6) + «ACADEMY» (7) lettere; due anelli da 4 curve l'uno; il timbro è vettoriale
    expect((await operatori(timbro)).curve - (await operatori(firmato)).curve).toBe(8);
    expect((await operatori(timbro)).lettere - (await operatori(firmato)).lettere).toBe(13);
    expect(await immagini(timbro)).toBeLessThan(await immagini(firmato)); // monogramma e QR, senza la firma
  });

  it("il timbro c'è anche col titolo più lungo e il nome più lungo", async () => {
    const bytes = await buildAttestatoEvalisPdf({
      ...base,
      learnerName: "Bartłomiej Świątkowski-Della Valle Andreoli",
      nascita: "nato/a a Reggio nell'Emilia il 29 febbraio 1984",
      courseTitle: "Parità di genere UNI/PdR 125:2022 — Sistema di gestione per la parità di genere nelle organizzazioni pubbliche e private",
    });
    expect((await operatori(bytes)).curve).toBe(8);
  });
});
