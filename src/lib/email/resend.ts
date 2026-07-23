// Invio email transazionale via Resend (chiamata diretta, niente astrazione provider).
// Best-effort: no-op se RESEND_API_KEY non è configurata. NOTA produzione: per inviare
// da un nostro indirizzo serve un dominio verificato su Resend (DNS SPF/DKIM); finché
// non c'è, RESEND_FROM resta onboarding@resend.dev (consegna solo all'account Resend).

import { Resend } from "resend";
import { renderEmail, esc } from "./layout";

export interface CertificateEmail {
  to: string;
  learnerName: string;
  courseTitle: string;
  verifyUrl: string;
}

export async function sendCertificateIssuedEmail(data: CertificateEmail): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false }; // non configurato → no-op

  const from = process.env.RESEND_FROM ?? "Evalis Academy <onboarding@resend.dev>";
  const resend = new Resend(key);
  await resend.emails.send({
    from,
    to: data.to,
    subject: `Attestato disponibile — ${data.courseTitle}`,
    html: renderEmail({
      previewText: `Il tuo attestato per ${data.courseTitle} è pronto.`,
      heading: "Il tuo attestato è disponibile",
      body: [
        `Ciao <strong>${esc(data.learnerName)}</strong>,`,
        `hai completato il corso <strong>${esc(data.courseTitle)}</strong> e il tuo attestato è stato emesso.`,
      ],
      button: { label: "Verifica l'attestato", url: data.verifyUrl },
      footerExtra:
        "Questo link mostra la pagina di verifica pubblica dell'attestato: autenticità, codice univoco e QR sono controllabili da chiunque.",
    }),
  });
  return { sent: true };
}

// Email transazionali di auth (reset password, verifica). In dev (o senza dominio
// Resend verificato) il link viene loggato così il flusso è testabile end-to-end;
// in produzione NON logghiamo il token (è un segreto): si invia solo via Resend.
function logAuthLinkInDev(label: string, to: string, url: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[${label}] → ${to}\n  link=${url}`);
  }
}

async function sendAuthEmail(opts: { to: string; subject: string; html: string }): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false }; // non configurato → no-op (link già loggato in dev)
  const from = process.env.RESEND_FROM ?? "Evalis Academy <onboarding@resend.dev>";
  const resend = new Resend(key);
  await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
  return { sent: true };
}

export async function sendPasswordResetEmail(data: { to: string; url: string }): Promise<{ sent: boolean }> {
  logAuthLinkInDev("reset-password", data.to, data.url);
  return sendAuthEmail({
    to: data.to,
    subject: "Reimposta la tua password — Evalis Academy",
    html: renderEmail({
      previewText: "Reimposta la password del tuo account Evalis Academy.",
      heading: "Reimposta la tua password",
      body: ["Hai richiesto di reimpostare la password del tuo account. Scegline una nuova dal pulsante qui sotto."],
      button: { label: "Reimposta la password", url: data.url },
      afterButton: ["Se non sei stato tu, ignora questa email: la password resta invariata."],
    }),
  });
}

export async function sendVerificationEmail(data: { to: string; url: string }): Promise<{ sent: boolean }> {
  logAuthLinkInDev("verify-email", data.to, data.url);
  return sendAuthEmail({
    to: data.to,
    subject: "Conferma il tuo indirizzo email — Evalis Academy",
    html: renderEmail({
      previewText: "Conferma il tuo indirizzo per attivare l'account Evalis Academy.",
      heading: "Benvenuto in Evalis Academy",
      body: ["Conferma il tuo indirizzo email per attivare l'account e iniziare i tuoi corsi."],
      button: { label: "Conferma l'email", url: data.url },
      afterButton: ["Se non hai creato tu questo account, puoi ignorare questa email."],
    }),
  });
}

export async function sendOrgInvitationEmail(data: { to: string; orgName: string; url: string }): Promise<{ sent: boolean }> {
  logAuthLinkInDev("invito-org", data.to, data.url);
  return sendAuthEmail({
    to: data.to,
    subject: `Invito a ${data.orgName} — Evalis Academy`,
    html: renderEmail({
      previewText: `${data.orgName} ti ha invitato su Evalis Academy.`,
      heading: `Sei stato invitato in ${esc(data.orgName)}`,
      body: [
        `<strong>${esc(data.orgName)}</strong> ti ha invitato a unirti al proprio spazio su Evalis Academy per seguire i corsi assegnati.`,
      ],
      button: { label: "Accetta l'invito", url: data.url },
      afterButton: ["Se non ti aspettavi questo invito, puoi ignorare questa email."],
    }),
  });
}
