// Se il font incorporato non si carica, il PDF esce lo stesso con Helvetica e i caratteri
// fuori alfabeto traslitterati (Ł → L, ș → s), invece di fallire.

import { describe, it, expect, vi } from "vitest";

vi.mock("../features/certificates/font-certificato", () => ({ NOTO_SANS_REGULAR: "bm9uLXVuLWZvbnQ=", NOTO_SANS_BOLD: "bm9uLXVuLWZvbnQ=" }));

import { PDFDocument } from "pdf-lib";
import { buildCertificatePdf } from "../features/certificates/pdf";

describe("certificato — ripiego senza font", () => {
  it("font rotto: PDF con Helvetica, nessun errore", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pdf = await buildCertificatePdf({
      learnerName: "Łukasz Ștefan Иван",
      courseTitle: "Corso",
      issuedAt: new Date("2026-10-06T10:00:00Z"),
      number: "EVALIS-2026-ABCD1234",
      verifyUrl: "https://example.test/verify/abcd",
      nascita: "nato/a a Łódź il 1 gennaio 1980",
    });
    const doc = await PDFDocument.load(pdf);
    const testo = doc.context.enumerateIndirectObjects().map(([, o]) => o.toString()).join(" ");
    expect(doc.getPageCount()).toBe(1);
    expect(testo).toContain("Helvetica");
    expect(testo).not.toContain("NotoSans");
  });
});
