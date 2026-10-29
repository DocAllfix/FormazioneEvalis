// Mail dei certificati. Funzioni PURE (oggetto + HTML), l'invio lo fa lifecycle.ts.
//  - a fine corso, all'UTENTE: il certificato provvisorio allegato;
//  - a fine corso, al COMMITTENTE: i dati per preparare il certificato accreditato, col provvisorio;
//  - al caricamento dell'accreditato, all'UTENTE: il certificato vero allegato.
// Tutti i valori dell'utente passano da esc().

import { renderEmail, esc } from "@/lib/email/layout";
import { DESTINATARI_INTERNI } from "@/features/billing/notifica-vendita";
import { notaProvvisorio, GIORNI_ACCREDITATO } from "./testi";
import { dataNascitaLeggibile } from "./anagrafica";
import { rigaChiediOpinione } from "@/features/recensioni/regole";

/**
 * Il committente riceve le mail SOLO dalla produzione vera: in locale, nei test e nelle Preview
 * la sua casella non deve mai ricevere prove (regola dell'utente). Fuori dalla produzione → null,
 * e chi chiama scrive nel log invece di inviare.
 */
export function destinatarioCommittente(env: Record<string, string | undefined> = process.env): string[] | null {
  return env.VERCEL_ENV === "production" ? DESTINATARI_INTERNI : null;
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
  /** dati per l'accreditato, chiesti prima dell'esame finale (null se mancano) */
  codiceFiscale: string | null;
  dataNascita: string | null; // "AAAA-MM-GG"
  luogoNascita: string | null;
  /** corso con attestato SOLO EVALIS: il definitivo lo emette la piattaforma dopo la verifica dello staff */
  soloEvalis: boolean;
};

const data = (d: Date) => d.toLocaleDateString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "long", year: "numeric" });
const ore = (minuti: number) => (minuti % 60 === 0 ? `${minuti / 60} ore` : `${Math.floor(minuti / 60)} h ${minuti % 60} min`);

export function nomeFileCertificato(number: string, provvisorio: boolean): string {
  return `${provvisorio ? "Certificato-provvisorio" : "Certificato"}-${number}.pdf`;
}

export function mailProvvisorioUtente(d: DatiCertificato, base: string): { subject: string; html: string } {
  const doc = d.soloEvalis ? "attestato" : "certificato";
  return {
    subject: `Corso completato: il tuo ${doc} provvisorio — ${d.courseTitle}`,
    html: renderEmail({
      previewText: `Hai completato ${d.courseTitle}. In allegato ${d.soloEvalis ? "l'attestato" : "il certificato"} provvisorio.`,
      heading: "Hai completato il corso",
      body: [
        `Complimenti <strong>${esc(d.learnerName)}</strong>, hai completato il corso <strong>${esc(d.courseTitle)}</strong> e superato l'esame finale.`,
        `In allegato trovi il tuo <strong>${doc} provvisorio</strong> n. <strong>${esc(d.number)}</strong>.`,
        esc(notaProvvisorio(d.soloEvalis)),
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
  const evalis = d.soloEvalis;
  return {
    subject: evalis ? `Attestato EVALIS da verificare: ${d.learnerName} · ${d.courseTitle}` : `Certificato da preparare: ${d.learnerName} · ${d.courseTitle}`,
    html: renderEmail({
      previewText: evalis
        ? `${d.learnerName} ha completato ${d.courseTitle}. Va verificato ed emesso l'attestato EVALIS.`
        : `${d.learnerName} ha completato ${d.courseTitle}. Va preparato il certificato accreditato.`,
      heading: evalis ? "Corso completato: attestato EVALIS da verificare" : "Corso completato: certificato da preparare",
      body: [
        evalis
          ? `Un utente ha completato il corso e ha ricevuto l'attestato provvisorio. Il corso rilascia l'<strong>attestato EVALIS Academy</strong> (nessun accreditamento esterno): va verificato ed emesso entro ${GIORNI_ACCREDITATO} giorni lavorativi.`
          : `Un utente ha completato il corso e ha ricevuto il certificato provvisorio. Va preparato il <strong>certificato accreditato</strong> entro ${GIORNI_ACCREDITATO} giorni lavorativi.`,
        `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.5;">${[
          riga("Nome", d.learnerName),
          riga("Email", d.learnerEmail),
          riga("Codice fiscale", d.codiceFiscale ?? "non indicato"),
          riga("Data di nascita", d.dataNascita ? dataNascitaLeggibile(d.dataNascita) : "non indicata"),
          riga("Luogo di nascita", d.luogoNascita ?? "non indicato"),
          riga("Corso", d.courseTitle),
          riga("Monte ore", ore(d.requiredMinutes)),
          riga("Completato il", data(d.completatoIl)),
          riga("Esame finale", d.punteggio == null ? "superato" : `superato con ${d.punteggio}/100`),
          riga("Numero certificato", d.number),
          riga("Verifica", d.verifyUrl),
        ].join("")}</table>`,
        evalis
          ? "In allegato l'attestato provvisorio. Verificati i dati, dalla console premi «Emetti attestato EVALIS»: la piattaforma genera l'attestato definitivo con lo stesso numero e lo stesso QR, l'utente lo riceve via email e lo trova nella sua area privata al posto del provvisorio."
          : "In allegato il certificato provvisorio. Quando l'accreditato è pronto, caricalo dalla console: l'utente lo riceve via email e lo trova nella sua area privata al posto del provvisorio.",
      ],
      button: {
        label: evalis ? "Verifica ed emetti l'attestato" : "Carica il certificato accreditato",
        url: `${base}/staff/certificati?q=${encodeURIComponent(d.number)}`,
      },
      footerExtra: "Notifica interna per lo staff Evalis Academy.",
    }),
  };
}

export function mailAccreditatoUtente(
  d: Pick<DatiCertificato, "learnerName" | "courseTitle" | "number">,
  base: string,
  aggiornato: boolean,
  /** l'utente non ha ancora lasciato la sua opinione sul corso: una riga per chiederla */
  chiediOpinione = false,
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
      ...(chiediOpinione ? { afterButton: [rigaChiediOpinione(base)] } : {}),
    }),
  };
}

/** All'emissione dell'attestato EVALIS (corsi senza accreditamento esterno), all'UTENTE. */
export function mailAttestatoEvalisUtente(
  d: Pick<DatiCertificato, "learnerName" | "courseTitle" | "number">,
  base: string,
  /** l'utente non ha ancora lasciato la sua opinione sul corso: una riga per chiederla */
  chiediOpinione = false,
): { subject: string; html: string } {
  return {
    subject: `Il tuo attestato EVALIS Academy — ${d.courseTitle}`,
    html: renderEmail({
      previewText: `L'attestato di formazione per ${d.courseTitle} è pronto.`,
      heading: "Il tuo attestato è pronto",
      body: [
        `Ciao <strong>${esc(d.learnerName)}</strong>,`,
        `in allegato trovi l'<strong>attestato di formazione EVALIS Academy</strong> del corso <strong>${esc(d.courseTitle)}</strong>. Sostituisce l'attestato provvisorio.`,
        `Numero attestato: <strong>${esc(d.number)}</strong>. Lo trovi anche nella tua area privata, pronto da scaricare.`,
      ],
      button: { label: "Vai ai tuoi certificati", url: `${base}/certificati` },
      ...(chiediOpinione ? { afterButton: [rigaChiediOpinione(base)] } : {}),
    }),
  };
}

/** Attestato EVALIS già emesso, riconsegnato con la firma: stesso numero, stessa data. */
export function mailAttestatoEvalisFirmato(
  d: Pick<DatiCertificato, "learnerName" | "courseTitle" | "number">,
  base: string,
): { subject: string; html: string } {
  return {
    subject: `Il tuo attestato EVALIS Academy firmato — ${d.courseTitle}`,
    html: renderEmail({
      previewText: `La versione firmata del tuo attestato per ${d.courseTitle}.`,
      heading: "Il tuo attestato, firmato",
      body: [
        `Ciao <strong>${esc(d.learnerName)}</strong>,`,
        `in allegato trovi l'<strong>attestato di formazione EVALIS Academy</strong> del corso <strong>${esc(d.courseTitle)}</strong> con la firma. Sostituisce quello che hai già ricevuto: numero, data e verifica restano gli stessi.`,
        `Numero attestato: <strong>${esc(d.number)}</strong>. Lo trovi anche nella tua area privata, pronto da scaricare.`,
      ],
      button: { label: "Vai ai tuoi certificati", url: `${base}/certificati` },
    }),
  };
}
