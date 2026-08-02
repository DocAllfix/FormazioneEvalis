// Genera l'anteprima dei 4 template email (HTML reale dal layout), con il logo incorporato
// come data URI così si vede offline. Scrive i 4 file + un indice in produzione/_email-preview/.
import fs from "node:fs";
import path from "node:path";
import { renderEmail, esc } from "@/lib/email/layout";

const OUT = "produzione/_email-preview";
fs.mkdirSync(OUT, { recursive: true });
const logoB64 = fs.readFileSync("public/brand/monogram.png").toString("base64");
const dataUri = `data:image/png;base64,${logoB64}`;
const LOGO_URL = "https://evalisacademy.it/brand/monogram.png";

const samples: Record<string, string> = {
  "1-verifica-email": renderEmail({
    previewText: "Conferma il tuo indirizzo per attivare l'account Evalis Academy.",
    heading: "Benvenuto in Evalis Academy",
    body: ["Conferma il tuo indirizzo email per attivare l'account e iniziare i tuoi corsi."],
    button: { label: "Conferma l'email", url: "https://evalisacademy.it/verifica?token=esempio" },
    afterButton: ["Se non hai creato tu questo account, puoi ignorare questa email."],
  }),
  "2-reset-password": renderEmail({
    previewText: "Reimposta la password del tuo account Evalis Academy.",
    heading: "Reimposta la tua password",
    body: ["Hai richiesto di reimpostare la password del tuo account. Scegline una nuova dal pulsante qui sotto."],
    button: { label: "Reimposta la password", url: "https://evalisacademy.it/reimposta?token=esempio" },
    afterButton: ["Se non sei stato tu, ignora questa email: la password resta invariata."],
  }),
  "3-invito-azienda": renderEmail({
    previewText: "Acme S.r.l. ti ha invitato su Evalis Academy.",
    heading: `Sei stato invitato in ${esc("Acme S.r.l.")}`,
    body: [`<strong>${esc("Acme S.r.l.")}</strong> ti ha invitato a unirti al proprio spazio su Evalis Academy per seguire i corsi assegnati.`],
    button: { label: "Accetta l'invito", url: "https://acme.evalisacademy.it/accept-invitation/esempio" },
    afterButton: ["Se non ti aspettavi questo invito, puoi ignorare questa email."],
  }),
  "4-attestato": renderEmail({
    previewText: "Il tuo attestato per ISO 19011:2026 è pronto.",
    heading: "Il tuo attestato è disponibile",
    body: [
      `Ciao <strong>${esc("Mario Rossi")}</strong>,`,
      `hai completato il corso <strong>${esc("ISO 19011:2026 — Auditor di sistemi di gestione")}</strong> e il tuo attestato è stato emesso.`,
    ],
    button: { label: "Verifica l'attestato", url: "https://evalisacademy.it/verify/esempio-uuid" },
    footerExtra:
      "Questo link mostra la pagina di verifica pubblica dell'attestato: autenticità, codice univoco e QR sono controllabili da chiunque.",
  }),
};

const links: string[] = [];
for (const [name, html] of Object.entries(samples)) {
  const withLogo = html.split(LOGO_URL).join(dataUri);
  fs.writeFileSync(path.join(OUT, `${name}.html`), withLogo);
  links.push(`<li><a href="${name}.html">${name}</a></li>`);
}
fs.writeFileSync(path.join(OUT, "index.html"),
  `<!doctype html><meta charset=utf-8><title>Anteprima email Evalis Academy</title>` +
  `<body style="font:15px sans-serif;background:#F4F3EF;padding:24px"><h2>Anteprima template email</h2><ul>${links.join("")}</ul></body>`);
console.log(`Scritti ${Object.keys(samples).length} template in ${OUT}/`);
process.exit(0);
