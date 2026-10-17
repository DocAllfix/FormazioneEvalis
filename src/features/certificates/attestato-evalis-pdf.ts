// L'attestato DEFINITIVO EVALIS Academy in stile completo: carta avorio, cornice oro, monogramma,
// titolo e nome in Cormorant Garamond, protocollo e QR di verifica.
//
// ⚠️ Oggi vale SOLO per i corsi in CORSI_STILE_COMPLETO (la PdR 125, richiesta del 17/10/2026):
// gli altri attestati EVALIS restano col modello di pdf.ts. Il provvisorio non cambia mai.
//
// ⚠️ Il «Protocollo n.» È il numero del certificato (EVALIS-AAAA-XXXXXXXX), non una numerazione a
// parte: è lo stesso che la pagina pubblica di verifica riconosce, quindi chi ha in mano solo la
// carta lo può verificare scrivendolo, e chi ha il QR ci arriva dritto.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { scrivibile } from "./pdf";
import { NOTO_SANS_REGULAR, NOTO_SANS_BOLD } from "./font-certificato";
import { CORMORANT_SEMIBOLD, CORMORANT_ITALIC, MONOGRAMMA_EVALIS_PNG } from "./grafica-attestato-evalis";

/** I corsi (per slug) che ricevono l'attestato definitivo in stile completo. */
export const CORSI_STILE_COMPLETO = new Set(["parita-di-genere-uni-pdr-125-2022"]);

export interface AttestatoEvalisData {
  learnerName: string;
  /** "nato/a a Roma il 1 gennaio 1980", sotto il nome (se i dati ci sono) */
  nascita?: string;
  courseTitle: string;
  /** Durata del corso in minuti (il tempo minimo di fruizione del corso). */
  durataMinuti: number;
  issuedAt: Date;
  /** Il numero del certificato, stampato come protocollo. */
  number: string;
  verifyUrl: string;
}

const AVORIO = rgb(0.988, 0.973, 0.941);
const ORO = rgb(0.69, 0.53, 0.2);
const ORO_CHIARO = rgb(0.85, 0.75, 0.52);
const INCHIOSTRO = rgb(0.13, 0.11, 0.09);
const GRIGIO = rgb(0.4, 0.37, 0.33);

type Fonts = { titolo: PDFFont; corsivo: PDFFont; testo: PDFFont; forte: PDFFont };

async function caricaFonts(doc: PDFDocument): Promise<Fonts> {
  try {
    doc.registerFontkit(fontkit);
    const [titolo, corsivo, testo, forte] = await Promise.all([
      doc.embedFont(Buffer.from(CORMORANT_SEMIBOLD, "base64")),
      doc.embedFont(Buffer.from(CORMORANT_ITALIC, "base64")),
      doc.embedFont(Buffer.from(NOTO_SANS_REGULAR, "base64")),
      doc.embedFont(Buffer.from(NOTO_SANS_BOLD, "base64")),
    ]);
    return { titolo, corsivo, testo, forte };
  } catch (e) {
    // un font che non si carica non deve mai impedire l'emissione: si ripiega sui font standard
    console.error("[certificati] font dell'attestato EVALIS non caricati, ripiego su Times/Helvetica", e);
    const [titolo, corsivo, testo, forte] = await Promise.all([
      doc.embedFont(StandardFonts.TimesRomanBold),
      doc.embedFont(StandardFonts.TimesRomanItalic),
      doc.embedFont(StandardFonts.Helvetica),
      doc.embedFont(StandardFonts.HelveticaBold),
    ]);
    return { titolo, corsivo, testo, forte };
  }
}

const ore = (minuti: number) => {
  const h = minuti / 60;
  const n = Number.isInteger(h) ? String(h) : h.toFixed(1).replace(".", ",");
  return `${n} ${h === 1 ? "ora" : "ore"}`;
};

/** Spezza un testo in righe che stanno in `larghezza`, al massimo `max` righe. */
function righe(testo: string, f: PDFFont, size: number, larghezza: number, max: number): string[] {
  const out: string[] = [];
  let corrente = "";
  for (const parola of testo.split(/\s+/).filter(Boolean)) {
    const prova = corrente ? `${corrente} ${parola}` : parola;
    if (f.widthOfTextAtSize(prova, size) <= larghezza || !corrente) corrente = prova;
    else {
      out.push(corrente);
      corrente = parola;
    }
  }
  if (corrente) out.push(corrente);
  return out.length <= max ? out : [...out.slice(0, max - 1), out.slice(max - 1).join(" ")];
}

/** La dimensione più grande, fino a `size`, a cui il testo sta in `larghezza` (minimo `min`). */
function adatta(testo: string, f: PDFFont, size: number, larghezza: number, min: number): number {
  let s = size;
  while (s > min && f.widthOfTextAtSize(testo, s) > larghezza) s -= 0.5;
  return s;
}

function rombo(page: PDFPage, x: number, y: number, r: number, color: RGB) {
  page.drawSvgPath(`M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`, { x, y, color });
}

export async function buildAttestatoEvalisPdf(d: AttestatoEvalisData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Attestato ${d.number}`);
  doc.setAuthor("EVALIS Academy");
  const page = doc.addPage([842, 595]); // A4 orizzontale
  const { width, height } = page.getSize();
  const f = await caricaFonts(doc);
  const cx = width / 2;

  const centro = (testo: string, y: number, size: number, font: PDFFont, color = INCHIOSTRO) => {
    const t = scrivibile(testo, font);
    page.drawText(t, { x: cx - font.widthOfTextAtSize(t, size) / 2, y, size, font, color });
  };
  /** Maiuscole spaziate, centrate: pdf-lib non ha la spaziatura fra lettere, la si fa a mano. */
  const spaziato = (testo: string, y: number, size: number, font: PDFFont, passo: number, color: RGB, x0?: number) => {
    const t = scrivibile(testo, font);
    const totale = Array.from(t).reduce((w, c) => w + font.widthOfTextAtSize(c, size) + passo, -passo);
    let x = x0 ?? cx - totale / 2;
    for (const c of Array.from(t)) {
      page.drawText(c, { x, y, size, font, color });
      x += font.widthOfTextAtSize(c, size) + passo;
    }
  };

  // ── Carta e cornice ──────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height, color: AVORIO });
  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: ORO, borderWidth: 2.2 });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: ORO_CHIARO, borderWidth: 0.6 });
  for (const [x, y] of [[28, 28], [width - 28, 28], [28, height - 28], [width - 28, height - 28]]) rombo(page, x, y, 5, ORO);

  // ── Intestazione ─────────────────────────────────────────────────────────────────────
  const logo = await doc.embedPng(Buffer.from(MONOGRAMMA_EVALIS_PNG, "base64"));
  const lato = 58;
  page.drawImage(logo, { x: cx - lato / 2, y: height - 56 - lato, width: lato, height: lato });
  spaziato("EVALIS ACADEMY", height - 132, 9.5, f.forte, 3.2, ORO);

  centro("Attestato di Formazione", height - 188, 42, f.titolo);
  page.drawLine({ start: { x: cx - 120, y: height - 208 }, end: { x: cx - 10, y: height - 208 }, thickness: 0.7, color: ORO });
  page.drawLine({ start: { x: cx + 10, y: height - 208 }, end: { x: cx + 120, y: height - 208 }, thickness: 0.7, color: ORO });
  rombo(page, cx, height - 208, 3.5, ORO);

  // ── Titolare ─────────────────────────────────────────────────────────────────────────
  centro("si attesta che", height - 242, 16, f.corsivo, GRIGIO);
  const nome = scrivibile(d.learnerName, f.titolo);
  centro(nome, height - 286, adatta(nome, f.titolo, 36, width - 200, 22), f.titolo);
  let y = height - 310;
  if (d.nascita) {
    centro(d.nascita, y, 10.5, f.testo, GRIGIO);
    y -= 32;
  } else {
    y -= 16;
  }

  // ── Corso ────────────────────────────────────────────────────────────────────────────
  centro("ha completato con esito positivo il corso di formazione", y, 15, f.corsivo, GRIGIO);
  y -= 34;
  for (const r of righe(d.courseTitle, f.forte, 18, width - 220, 2)) {
    centro(r, y, 18, f.forte);
    y -= 24;
  }
  centro(`Formazione a distanza · durata ${ore(d.durataMinuti)} · esame finale superato`, y - 2, 10.5, f.testo, GRIGIO);

  // ── Piede: protocollo e data a sinistra, QR a destra ─────────────────────────────────
  const piede = 96;
  spaziato("PROTOCOLLO N.", piede + 48, 8, f.forte, 1.6, ORO, 64);
  page.drawText(scrivibile(d.number, f.forte), { x: 64, y: piede + 30, size: 14, font: f.forte, color: INCHIOSTRO });
  spaziato("DATA DI EMISSIONE", piede + 8, 8, f.forte, 1.6, ORO, 64);
  page.drawText(d.issuedAt.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" }), {
    x: 64,
    y: piede - 10,
    size: 12,
    font: f.testo,
    color: INCHIOSTRO,
  });

  page.drawLine({ start: { x: cx - 95, y: piede + 22 }, end: { x: cx + 95, y: piede + 22 }, thickness: 0.6, color: ORO_CHIARO });
  centro("Rilasciato da EVALIS Academy", piede + 4, 13, f.corsivo, GRIGIO);

  const qrPng = await doc.embedPng(
    await QRCode.toDataURL(d.verifyUrl, { margin: 1, width: 240, color: { dark: "#211c17", light: "#fcf8f0" } }),
  );
  const qr = 92;
  const qx = width - 64 - qr;
  page.drawImage(qrPng, { x: qx, y: piede - 14, width: qr, height: qr });
  const verifica = "Verifica l'autenticità";
  const vt = scrivibile(verifica, f.forte);
  page.drawText(vt, { x: qx + qr - f.forte.widthOfTextAtSize(vt, 8), y: piede - 28, size: 8, font: f.forte, color: ORO });
  const url = scrivibile(d.verifyUrl, f.testo);
  const us = adatta(url, f.testo, 7, 300, 5);
  page.drawText(url, { x: qx + qr - f.testo.widthOfTextAtSize(url, us), y: piede - 39, size: us, font: f.testo, color: GRIGIO });

  return doc.save();
}
