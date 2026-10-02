// Generazione del PDF attestato con pdf-lib + QR (qrcode). Nessuna rete → testabile.
// Layout programmatico (niente headless browser): A4 orizzontale, font standard.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { RIGA_PROVVISORIO_1, RIGA_PROVVISORIO_2 } from "./testi";

export interface CertificateData {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  number: string;
  verifyUrl: string;
  /** Attestato PROVVISORIO di fine corso: lo dice nel titolo e in una fascia, e `issuedAt` è la
   * data di completamento. Il certificato vero è l'accreditato caricato dallo staff. */
  provvisorio?: boolean;
}

export async function buildCertificatePdf(d: CertificateData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 orizzontale (punti)
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.1, 0.1);
  const accent = rgb(0.2, 0.3, 0.5);

  const center = (text: string, y: number, size: number, f = font) => {
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
  center("ha completato con successo il corso", height - 260, 14);
  center(d.courseTitle, height - 300, 20, bold);
  center(`${d.provvisorio ? "Data di completamento" : "Data di emissione"}: ${d.issuedAt.toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}`, height - 345, 12);
  center(`Numero attestato: ${d.number}`, height - 365, 12);

  if (d.provvisorio) {
    // fascia: deve essere impossibile scambiarlo per il certificato accreditato
    page.drawRectangle({ x: 60, y: 180, width: width - 120, height: 44, color: rgb(1, 0.95, 0.88), borderColor: rgb(0.92, 0.35, 0.05), borderWidth: 1 });
    center(RIGA_PROVVISORIO_1, 205, 11, bold);
    center(RIGA_PROVVISORIO_2, 189, 10);
  }

  // QR verso la pagina di verifica pubblica
  const qrDataUrl = await QRCode.toDataURL(d.verifyUrl, { margin: 1, width: 140 });
  const qrPng = await doc.embedPng(qrDataUrl);
  const qrDim = 110;
  page.drawImage(qrPng, { x: width - qrDim - 60, y: 55, width: qrDim, height: qrDim });
  page.drawText("Verifica l'autenticità:", { x: 60, y: 110, size: 9, font, color: ink });
  page.drawText(d.verifyUrl, { x: 60, y: 95, size: 9, font, color: accent });

  return doc.save();
}
