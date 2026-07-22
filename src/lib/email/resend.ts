// Invio email transazionale via Resend (chiamata diretta, niente astrazione provider).
// Best-effort: no-op se RESEND_API_KEY non è configurata. NOTA produzione: per inviare
// da un nostro indirizzo serve un dominio verificato su Resend (DNS SPF/DKIM); finché
// non c'è, RESEND_FROM resta onboarding@resend.dev (consegna solo all'account Resend).

import { Resend } from "resend";

export interface CertificateEmail {
  to: string;
  learnerName: string;
  courseTitle: string;
  verifyUrl: string;
}

export async function sendCertificateIssuedEmail(data: CertificateEmail): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false }; // non configurato → no-op

  const from = process.env.RESEND_FROM ?? "Formazione Evalis <onboarding@resend.dev>";
  const resend = new Resend(key);
  await resend.emails.send({
    from,
    to: data.to,
    subject: `Attestato disponibile — ${data.courseTitle}`,
    html:
      `<p>Ciao ${data.learnerName},</p>` +
      `<p>il tuo attestato per il corso <strong>${data.courseTitle}</strong> è stato emesso.</p>` +
      `<p>Puoi verificarne l'autenticità qui: <a href="${data.verifyUrl}">${data.verifyUrl}</a></p>`,
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
  const from = process.env.RESEND_FROM ?? "Formazione Evalis <onboarding@resend.dev>";
  const resend = new Resend(key);
  await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
  return { sent: true };
}

export async function sendPasswordResetEmail(data: { to: string; url: string }): Promise<{ sent: boolean }> {
  logAuthLinkInDev("reset-password", data.to, data.url);
  return sendAuthEmail({
    to: data.to,
    subject: "Reimposta la tua password — Formazione Evalis",
    html:
      `<p>Hai richiesto di reimpostare la password.</p>` +
      `<p>Apri questo link per scegliere una nuova password: <a href="${data.url}">${data.url}</a></p>` +
      `<p>Se non sei stato tu, ignora questa email: la password resta invariata.</p>`,
  });
}

export async function sendVerificationEmail(data: { to: string; url: string }): Promise<{ sent: boolean }> {
  logAuthLinkInDev("verify-email", data.to, data.url);
  return sendAuthEmail({
    to: data.to,
    subject: "Conferma il tuo indirizzo email — Formazione Evalis",
    html:
      `<p>Benvenuto in Formazione Evalis.</p>` +
      `<p>Conferma il tuo indirizzo email aprendo questo link: <a href="${data.url}">${data.url}</a></p>`,
  });
}

export async function sendOrgInvitationEmail(data: { to: string; orgName: string; url: string }): Promise<{ sent: boolean }> {
  logAuthLinkInDev("invito-org", data.to, data.url);
  return sendAuthEmail({
    to: data.to,
    subject: `Invito a ${data.orgName} — Formazione Evalis`,
    html:
      `<p>Sei stato invitato a unirti a <strong>${data.orgName}</strong> su Formazione Evalis.</p>` +
      `<p>Accetta l'invito aprendo questo link: <a href="${data.url}">${data.url}</a></p>`,
  });
}
