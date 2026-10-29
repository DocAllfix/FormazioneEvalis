// Recensioni dei corsi — REGOLE PURE (nessun database, nessun invio): controllo dei dati, nome
// che compare sul sito, testo del consenso, destinatari e testo della mail allo staff.
// Decisioni dell'utente del 29/10/2026: nome scelto da chi scrive (nome e cognome / nome e
// iniziale / non pubblicare), voto della piattaforma facoltativo, approvazione dello staff, mail
// di notifica SOLO a dilonardoa28@gmail.com, media sulla scheda del corso da 3 voti.

import { ErroreUtente } from "@/lib/esito";
import { esc } from "@/lib/email/layout";

export const FORME_PUBBLICAZIONE = ["no", "nome_cognome", "nome_iniziale"] as const;
export type FormaPubblicazione = (typeof FORME_PUBBLICAZIONE)[number];

export const MAX_TESTO = 800;
/** Voti minimi perché la scheda del corso mostri la media. */
export const MIN_VOTI_MEDIA = 3;
/** Opinioni in evidenza minime perché la landing mostri «Dicono di noi». */
export const MIN_OPINIONI_LANDING = 3;

/** Alzarla quando il testo del consenso cambia: chi acconsente dopo accetta il testo nuovo. */
export const VERSIONE_CONSENSO = 1;
export const TESTO_CONSENSO =
  "Acconsento alla pubblicazione della mia opinione e delle mie stelle sul sito Evalis Academy (pagina principale e scheda del corso), con il nome nella forma che scelgo qui. Posso ritirare il consenso in qualsiasi momento da questa pagina: l'opinione viene tolta dal sito.";

export type DatiRecensione = {
  votoCorso: number;
  votoPiattaforma: number | null;
  testo: string;
  pubblicazione: FormaPubblicazione;
};

const voto = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;

/** Controlla e normalizza quello che arriva dal browser. Lancia ErroreUtente con un messaggio leggibile. */
export function validaRecensione(input: unknown): DatiRecensione {
  const i = (input ?? {}) as Record<string, unknown>;
  if (!voto(i.votoCorso)) throw new ErroreUtente("Scegli da 1 a 5 stelle per il corso.");
  const vp = i.votoPiattaforma ?? null;
  if (vp !== null && !voto(vp)) throw new ErroreUtente("Le stelle della piattaforma vanno da 1 a 5.");
  const testo = typeof i.testo === "string" ? i.testo.replace(/\r\n/g, "\n").trim() : "";
  if (testo.length > MAX_TESTO) throw new ErroreUtente(`L'opinione può avere al massimo ${MAX_TESTO} caratteri.`);
  const pubblicazione = (i.pubblicazione ?? "no") as FormaPubblicazione;
  if (!FORME_PUBBLICAZIONE.includes(pubblicazione)) throw new ErroreUtente("Scelta di pubblicazione non valida.");
  if (pubblicazione !== "no" && testo === "") {
    throw new ErroreUtente("Per pubblicare l'opinione sul sito scrivi qualche parola, oppure togli il consenso.");
  }
  return { votoCorso: i.votoCorso as number, votoPiattaforma: vp as number | null, testo, pubblicazione };
}

const maiuscola = (p: string) => p.charAt(0).toLocaleUpperCase("it-IT") + p.slice(1);

/** Il nome come compare sul sito: «Mario Rossi» oppure «Mario R.»; null se non si pubblica. */
export function nomePubblico(nome: string, forma: FormaPubblicazione): string | null {
  if (forma === "no") return null;
  const parti = nome.trim().split(/\s+/).filter(Boolean).map((p) => maiuscola(p.toLocaleLowerCase("it-IT")));
  if (parti.length === 0) return null;
  if (forma === "nome_cognome" || parti.length === 1) return parti.join(" ");
  return `${parti[0]} ${parti[parti.length - 1].charAt(0)}.`;
}

/** Serve l'approvazione dello staff solo se l'opinione può finire sul sito. */
export const daApprovare = (d: Pick<DatiRecensione, "pubblicazione" | "testo">) => d.pubblicazione !== "no" && d.testo !== "";

/**
 * Chi riceve la mail «recensione da approvare»: SOLO dilonardoa28@gmail.com (decisione
 * dell'utente) e SOLO dalla produzione vera, come la mail al committente: in locale, nei test e
 * nelle Preview nessuna casella riceve prove.
 */
export function destinatariRecensioni(env: Record<string, string | undefined> = process.env): string[] {
  return env.VERCEL_ENV === "production" ? ["dilonardoa28@gmail.com"] : [];
}

export const stelle = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

const ETICHETTA_FORMA: Record<FormaPubblicazione, string> = {
  no: "non pubblicare",
  nome_cognome: "nome e cognome",
  nome_iniziale: "nome e iniziale",
};

/** Mail allo staff: c'è un'opinione da approvare (nuova o modificata). */
export function mailRecensioneDaApprovare(
  r: { autore: string; email: string; corso: string; nomePubblico: string; modificata: boolean } & DatiRecensione,
  base: string,
): { subject: string; previewText: string; heading: string; body: string[]; button: { label: string; url: string } } {
  return {
    subject: `${r.modificata ? "Recensione modificata" : "Nuova recensione"} da approvare: ${r.corso}`,
    previewText: `${r.autore} ha lasciato ${r.votoCorso} stelle su ${r.corso}.`,
    heading: r.modificata ? "Recensione modificata da approvare" : "Nuova recensione da approvare",
    body: [
      `<strong>${esc(r.autore)}</strong> (${esc(r.email)}) ha ${r.modificata ? "modificato la sua opinione" : "lasciato un'opinione"} sul corso <strong>${esc(r.corso)}</strong>.`,
      `Corso: <strong>${stelle(r.votoCorso)}</strong>${r.votoPiattaforma ? ` · Piattaforma: <strong>${stelle(r.votoPiattaforma)}</strong>` : ""}`,
      `<div style="border-left:3px solid #E6DCCB;padding:8px 14px;white-space:pre-wrap">${esc(r.testo)}</div>`,
      `Sul sito comparirebbe come <strong>${esc(r.nomePubblico)}</strong> (${ETICHETTA_FORMA[r.pubblicazione]}).`,
    ],
    button: { label: "Apri le recensioni da approvare", url: `${base}/staff/recensioni` },
  };
}

/** Riga per la mail del certificato accreditato / attestato EVALIS, se l'opinione manca. */
export function rigaChiediOpinione(base: string): string {
  return `Com'è andato il corso? Ci aiuti molto se ci lasci la tua opinione: bastano un minuto e qualche stella, dalla pagina <a href="${base}/certificati" style="color:#EA580C">I tuoi certificati</a>.`;
}
