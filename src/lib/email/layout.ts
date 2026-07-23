// Layout email condiviso (transazionali). HTML email-safe: tabelle + CSS inline, palette
// "Ambra" del brand, header con logo servito da /brand/monogram.png (URL ASSOLUTO dal dominio),
// footer Evalis Academy. Nessuna dipendenza esterna: le 4 email in resend.ts lo riusano.

const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Palette Ambra (coerente con la landing)
const C = {
  cream: "#F4F3EF",
  card: "#FFFFFF",
  border: "#EAE4DB",
  primary: "#EA580C",
  nearBlack: "#1A1209",
  body: "#5C5347",
  muted: "#8A8073",
  peach: "#FEF0EB",
};

/** Escapa i valori dinamici (nome utente, titolo corso, ...) prima di inserirli in HTML. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailButton = { label: string; url: string };

export function renderEmail(opts: {
  previewText: string;
  heading: string;
  /** paragrafi HTML del corpo (usa esc() sui valori dinamici a monte) */
  body: string[];
  button?: EmailButton;
  /** paragrafi dopo il bottone (es. "se non sei stato tu, ignora") */
  afterButton?: string[];
  /** riga extra nel footer (es. nota di verifica del certificato) */
  footerExtra?: string;
}): string {
  const logo = `${BASE}/brand/monogram.png`;
  const p = (html: string, color = C.body) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${color};">${html}</p>`;

  const button = opts.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
         <tr><td style="border-radius:10px;background:${C.primary};">
           <a href="${opts.button.url}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(opts.button.label)}</a>
         </td></tr>
       </table>`
    : "";

  const fallbackLink = opts.button
    ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${C.muted};">Se il pulsante non funziona, copia e incolla questo indirizzo nel browser:<br><a href="${opts.button.url}" style="color:${C.primary};word-break:break-all;">${opts.button.url}</a></p>`
    : "";

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.previewText)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
      <!-- header -->
      <tr><td style="padding:28px 32px 20px;border-bottom:1px solid ${C.border};">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:10px;"><img src="${logo}" width="34" height="34" alt="Evalis Academy" style="display:block;border-radius:8px;"></td>
          <td style="font-family:'Lexend',Arial,sans-serif;font-size:18px;font-weight:700;color:${C.nearBlack};letter-spacing:-0.01em;">Evalis Academy</td>
        </tr></table>
      </td></tr>
      <!-- body -->
      <tr><td style="padding:28px 32px 8px;font-family:'Source Sans 3','Source Sans Pro',Arial,sans-serif;">
        <h1 style="margin:0 0 18px;font-family:'Lexend',Arial,sans-serif;font-size:22px;line-height:1.3;color:${C.nearBlack};font-weight:700;">${esc(opts.heading)}</h1>
        ${opts.body.map((b) => p(b)).join("")}
        ${button}
        ${fallbackLink}
        ${(opts.afterButton ?? []).map((b) => p(b, C.muted)).join("")}
      </td></tr>
      <!-- footer -->
      <tr><td style="padding:20px 32px 28px;border-top:1px solid ${C.border};font-family:'Source Sans 3',Arial,sans-serif;">
        ${opts.footerExtra ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${C.body};">${opts.footerExtra}</p>` : ""}
        <p style="margin:0;font-size:12px;line-height:1.6;color:${C.muted};">
          <strong style="color:${C.body};">Evalis Academy</strong> — Formazione e certificazione professionale.<br>
          Hai ricevuto questa email perché è associata a un account su <a href="${BASE}" style="color:${C.primary};text-decoration:none;">evalisacademy.it</a>.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
