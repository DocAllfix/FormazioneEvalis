// Generazione del PDF attestato con pdf-lib + QR (qrcode). Nessuna rete → testabile.
// Layout programmatico (niente headless browser): A4 orizzontale, font standard.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export interface CertificateData {
  learnerName: string;
  courseTitle: string;
  issuedAt: Date;
  number: string;
  verifyUrl: string;
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

  center("ATTESTATO DI COMPLETAMENTO", height - 110, 26, bold);
  center("Si certifica che", height - 170, 14);
  center(d.learnerName, height - 215, 30, bold);
  center("ha completato con successo il corso", height - 260, 14);
  center(d.courseTitle, height - 300, 20, bold);
  center(`Data di emissione: ${d.issuedAt.toLocaleDateString("it-IT")}`, height - 345, 12);
  center(`Numero attestato: ${d.number}`, height - 365, 12);

  // QR verso la pagina di verifica pubblica
  const qrDataUrl = await QRCode.toDataURL(d.verifyUrl, { margin: 1, width: 140 });
  const qrPng = await doc.embedPng(qrDataUrl);
  const qrDim = 110;
  page.drawImage(qrPng, { x: width - qrDim - 60, y: 55, width: qrDim, height: qrDim });
  page.drawText("Verifica l'autenticità:", { x: 60, y: 110, size: 9, font, color: ink });
  page.drawText(d.verifyUrl, { x: 60, y: 95, size: 9, font, color: accent });

  return doc.save();
}
