// Il PDF del certificato si genera anche con nomi, luoghi e titoli fuori dall'alfabeto
// dell'Helvetica standard (polacco, rumeno, nordico, cirillico…). Prima un solo carattere
// come "Ł" faceva fallire il PDF provvisorio e con lui le mail di fine corso.

import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildCertificatePdf } from "../features/certificates/pdf";

/** nomi dei font usati nel PDF (stanno negli oggetti compressi, non nel testo grezzo) */
async function fontUsati(pdf: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(pdf);
  return doc.context
    .enumerateIndirectObjects()
    .map(([, o]) => o.toString())
    .filter((t) => t.includes("/BaseFont"))
    .join(" ");
}

const base = {
  courseTitle: "Auditor ISO 9001 — Ørsted & Søn",
  issuedAt: new Date("2026-10-06T10:00:00Z"),
  number: "EVALIS-2026-ABCD1234",
  verifyUrl: "https://example.test/verify/abcd",
  provvisorio: true,
};

describe("certificato — caratteri speciali", () => {
  it.each([
    ["polacco", "Łukasz Żółć", "nato/a a Łódź (Polonia) il 1 gennaio 1980"],
    ["rumeno", "Ștefan Țăran", "nato/a a Brașov il 2 febbraio 1985"],
    ["cirillico", "Иван Петров", "nato/a a Київ il 3 marzo 1990"],
    ["greco", "Γιώργος Παπαδόπουλος", undefined],
    ["fuori da ogni alfabeto del font", "王小明 🙂", undefined],
  ])("%s: il PDF nasce", async (_n, learnerName, nascita) => {
    const pdf = await buildCertificatePdf({ ...base, learnerName, nascita });
    expect(Buffer.from(pdf.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  });

  it("nome italiano: PDF con il font incorporato e leggero", async () => {
    const pdf = await buildCertificatePdf({ ...base, learnerName: "Niccolò D'Àmico", nascita: "nato/a a Forlì il 4 aprile 1975" });
    expect(await fontUsati(pdf)).toContain("NotoSans");
    expect(pdf.length).toBeLessThan(200_000);
  });
});
