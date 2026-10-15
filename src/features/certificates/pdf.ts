// Generazione del PDF attestato con pdf-lib + QR (qrcode). Nessuna rete → testabile.
// Layout programmatico (niente headless browser): A4 orizzontale, font Noto Sans incorporato
// (nomi e luoghi con Ł, ș, cirillico…); se il font non si carica, Helvetica standard.

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { RIGA_PROVVISORIO_1, RIGA_PROVVISORIO_2, RIGA_PROVVISORIO_EVALIS_1, RIGA_PROVVISORIO_EVALIS_2 } from "./testi";
import { NOTO_SANS_REGULAR, NOTO_SANS_BOLD } from "./font-certificato";

// lettere senza scomposizione Unicode, per il ripiego su Helvetica
const SENZA_ACCENTO: Record<string, string> = { Ł: "L", ł: "l", Đ: "D", đ: "d", Ħ: "H", ħ: "h", ı: "i" };

/** Il testo con i soli caratteri che il font sa disegnare: gli altri perdono l'accento
 *  (ș → s) o diventano "?". Un carattere mancante non deve mai far fallire il PDF. */
function scrivibile(testo: string, f: PDFFont): string {
  const ok = new Set(f.getCharacterSet());
  const ha = (s: string) => Array.from(s).every((c) => ok.has(c.codePointAt(0)!));
  return Array.from(testo)
    .map((c) => {
      if (ha(c)) return c;
      const base = SENZA_ACCENTO[c] ?? c.normalize("NFD").replace(/\p{M}/gu, "");
      return base && ha(base) ? base : "?";
    })
    .join("");
}

async function caricaFont(doc: PDFDocument): Promise<[PDFFont, PDFFont]> {
  try {
    doc.registerFontkit(fontkit);
    return [
      await doc.embedFont(Buffer.from(NOTO_SANS_REGULAR, "base64")),
      await doc.embedFont(Buffer.from(NOTO_SANS_BOLD, "base64")),
    ];
  } catch (e) {
    console.error("[certificati] font Noto non caricato, ripiego su Helvetica", e);
    return [await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold)];
  }
}

export interface CertificateData {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  number: string;
  verifyUrl: string;
  /** Attestato PROVVISORIO di fine corso: lo dice nel titolo e in una fascia, e `issuedAt` è la
   * data di completamento. Il certificato vero è l'accreditato caricato dallo staff. */
  provvisorio?: boolean;
  /** "nato/a a Roma il 1 gennaio 1980", sotto il nome (se i dati ci sono) */
  nascita?: string;
  /** Corso con attestato SOLO EVALIS: il provvisorio rimanda all'attestato EVALIS (non a un
   * accreditamento) e il definitivo dichiara chi lo rilascia. */
  soloEvalis?: boolean;
}

export async function buildCertificatePdf(d: CertificateData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 orizzontale (punti)
  const { width, height } = page.getSize();
  const [font, bold] = await caricaFont(doc);
  const ink = rgb(0.1, 0.1, 0.1);
  const accent = rgb(0.2, 0.3, 0.5);

  const center = (testo: string, y: number, size: number, f = font) => {
    const text = scrivibile(testo, f);
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font: f, color: ink });
  };

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: accent,
    borderWidth: 2,
  });

  center(d.provvisorio ? "ATTESTATO DI COMPLETAMENTO PROVVISORIO" : "ATTESTATO DI COMPLETAMENTO", height - 110, d.provvisorio ? 22 : 26, bold);
  center("Si certifica che", height - 170, 14);
  center(d.learnerName, height - 215, 30, bold);
  if (d.nascita) center(d.nascita, height - 238, 11);
  center("ha completato con successo il corso", height - 260, 14);
  center(d.courseTitle, height - 300, 20, bold);
  center(`${d.provvisorio ? "Data di completamento" : "Data di emissione"}: ${d.issuedAt.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}`, height - 345, 12);
  center(`Numero attestato: ${d.number}`, height - 365, 12);

  if (d.provvisorio) {
    // fascia: deve essere impossibile scambiarlo per il certificato accreditato
    page.drawRectangle({ x: 60, y: 180, width: width - 120, height: 44, color: rgb(1, 0.95, 0.88), borderColor: rgb(0.92, 0.35, 0.05), borderWidth: 1 });
    center(d.soloEvalis ? RIGA_PROVVISORIO_EVALIS_1 : RIGA_PROVVISORIO_1, 205, 11, bold);
    center(d.soloEvalis ? RIGA_PROVVISORIO_EVALIS_2 : RIGA_PROVVISORIO_2, 189, 10);
  } else if (d.soloEvalis) {
    center("Attestato di formazione rilasciato da EVALIS Academy", 200, 11);
  }

  // QR verso la pagina di verifica pubblica
  const qrDataUrl = await QRCode.toDataURL(d.verifyUrl, { margin: 1, width: 140 });
  const qrPng = await doc.embedPng(qrDataUrl);
  const qrDim = 110;
  page.drawImage(qrPng, { x: width - qrDim - 60, y: 55, width: qrDim, height: qrDim });
  page.drawText(scrivibile("Verifica l'autenticità:", font), { x: 60, y: 110, size: 9, font, color: ink });
  page.drawText(scrivibile(d.verifyUrl, font), { x: 60, y: 95, size: 9, font, color: accent });

  return doc.save();
}
