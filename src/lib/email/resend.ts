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
