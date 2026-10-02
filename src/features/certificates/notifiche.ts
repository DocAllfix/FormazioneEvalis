// Mail dei certificati. Funzioni PURE (oggetto + HTML), l'invio lo fa lifecycle.ts.
//  - a fine corso, all'UTENTE: il certificato provvisorio allegato;
//  - a fine corso, al COMMITTENTE: i dati per preparare il certificato accreditato, col provvisorio;
//  - al caricamento dell'accreditato, all'UTENTE: il certificato vero allegato.
// Tutti i valori dell'utente passano da esc().

import { renderEmail, esc } from "@/lib/email/layout";
import { EMAIL_VENDITE } from "@/features/billing/notifica-vendita";
import { NOTA_PROVVISORIO, GIORNI_ACCREDITATO } from "./testi";

/**
 * Il committente riceve le mail SOLO dalla produzione vera: in locale, nei test e nelle Preview
 * la sua casella non deve mai ricevere prove (regola dell'utente). Fuori dalla produzione → null,
 * e chi chiama scrive nel log invece di inviare.
 */
export function destinatarioCommittente(env: Record<string, string | undefined> = process.env): string | null {
  return env.VERCEL_ENV === "production" ? EMAIL_VENDITE : null;
}

export type DatiCertificato = {
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  requiredMinutes: number;
  completatoIl: Date;
  number: string;
  verifyUrl: string;
  /** punteggio dell'esame finale superato (0-100), se c'è */
  punteggio: number | null;
};

const data = (d: Date) => d.toLocaleDateString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "long", year: "numeric" });
const ore = (minuti: number) => (minuti % 60 === 0 ? `${minuti / 60} ore` : `${Math.floor(minuti / 60)} h ${minuti % 60} min`);

export function nomeFileCertificato(number: string, provvisorio: boolean): string {
  return `${provvisorio ? "Certificato-provvisorio" : "Certificato"}-${number}.pdf`;
}

export function mailProvvisorioUtente(d: DatiCertificato, base: string): { subject: string; html: string } {
  return {
    subject: `Corso completato: il tuo certificato provvisorio — ${d.courseTitle}`,
    html: renderEmail({
      previewText: `Hai completato ${d.courseTitle}. In allegato il certificato provvisorio.`,
      heading: "Hai completato il corso",
      body: [
        `Complimenti <strong>${esc(d.learnerName)}</strong>, hai completato il corso <strong>${esc(d.courseTitle)}</strong> e superato l'esame finale.`,
        `In allegato trovi il tuo <strong>certificato provvisorio</strong> n. <strong>${esc(d.number)}</strong>.`,
        esc(NOTA_PROVVISORIO),
      ],
      button: { label: "Vai ai tuoi certificati", url: `${base}/certificati` },
      footerExtra: `Il codice del certificato si può verificare in ogni momento su ${esc(base.replace(/^https?:\/\//, ""))}, nella sezione "Verifica certificato".`,
    }),
  };
}

export function mailProvvisorioCommittente(d: DatiCertificato, base: string): { subject: string; html: string } {
  const riga = (etichetta: string, valore: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#8A8073;white-space:nowrap;vertical-align:top;">${etichetta}</td>` +
    `<td style="padding:6px 0;color:#1A1209;"><strong>${esc(valore)}</strong></td></tr>`;
  return {
    subject: `Certificato da preparare: ${d.learnerName} · ${d.courseTitle}`,
    html: renderEmail({
      previewText: `${d.learnerName} ha completato ${d.courseTitle}. Va preparato il certificato accreditato.`,
      heading: "Corso completato: certificato da preparare",
      body: [
        `Un utente ha completato il corso e ha ricevuto il certificato provvisorio. Va preparato il <strong>certificato accreditato</strong> entro ${GIORNI_ACCREDITATO} giorni lavorativi.`,
        `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.5;">${[
          riga("Nome", d.learnerName),
          riga("Email", d.learnerEmail),
          riga("Corso", d.courseTitle),
          riga("Monte ore", ore(d.requiredMinutes)),
          riga("Completato il", data(d.completatoIl)),
          riga("Esame finale", d.punteggio == null ? "superato" : `superato con ${d.punteggio}/100`),
          riga("Numero certificato", d.number),
          riga("Verifica", d.verifyUrl),
        ].join("")}</table>`,
        "In allegato il certificato provvisorio. Quando l'accreditato è pronto, caricalo dalla console: l'utente lo riceve via email e lo trova nella sua area privata al posto del provvisorio.",
      ],
      button: { label: "Carica il certificato accreditato", url: `${base}/staff/certificati?q=${encodeURIComponent(d.number)}` },
      footerExtra: "Notifica interna per lo staff Evalis Academy.",
    }),
  };
}

export function mailAccreditatoUtente(
  d: Pick<DatiCertificato, "learnerName" | "courseTitle" | "number">,
  base: string,
  aggiornato: boolean,
): { subject: string; html: string } {
  return {
    subject: `${aggiornato ? "Certificato aggiornato" : "Il tuo certificato accreditato"} — ${d.courseTitle}`,
    html: renderEmail({
      previewText: `Il certificato accreditato per ${d.courseTitle} è pronto.`,
      heading: aggiornato ? "Il tuo certificato è stato aggiornato" : "Il tuo certificato accreditato è pronto",
      body: [
        `Ciao <strong>${esc(d.learnerName)}</strong>,`,
        aggiornato
          ? `abbiamo aggiornato il certificato accreditato del corso <strong>${esc(d.courseTitle)}</strong>: in allegato trovi la versione corretta, che sostituisce la precedente.`
          : `in allegato trovi il <strong>certificato accreditato</strong> del corso <strong>${esc(d.courseTitle)}</strong>. Sostituisce il certificato provvisorio.`,
        `Numero certificato: <strong>${esc(d.number)}</strong>. Lo trovi anche nella tua area privata, pronto da scaricare.`,
      ],
      button: { label: "Vai ai tuoi certificati", url: `${base}/certificati` },
    }),
  };
}
