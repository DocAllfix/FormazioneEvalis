// Assistenza — notifiche email dei ticket. LOGICA PURA: chi avvisare e con che testo.
// L'invio vero è iniettato (`Invia`), così questo modulo si collauda senza mandare email e
// senza database. Le server action lo chiamano DOPO che il ticket è scritto.
//
// Tre eventi, le stesse regole di Bilanciotool (concordate fra i due progetti):
//   1. l'utente apre un ticket            -> email agli amministratori
//   2. l'utente risponde nel suo ticket   -> email agli amministratori
//   3. lo staff risponde                  -> email al proprietario del ticket
// Chi scrive non riceve mai la propria email: uno staff che risponde a un ticket SUO non
// avvisa nessuno per nessuna delle due strade.
//
// ⚠️ BEST EFFORT. Un'email che non parte non deve mai far fallire il ticket né mostrare un
// errore a chi l'ha scritto: il ticket è già salvato, l'email è un avviso in più.

import { esc } from "@/lib/email/layout";

/** Firma dell'invio reale. `to` può avere più indirizzi. */
export type Invia = (m: { to: string[]; subject: string; html: string }) => Promise<unknown>;

/** Rende l'HTML dell'email: iniettato anche questo, per non legare il modulo al layout. */
export type Rendi = (opts: {
  previewText: string;
  heading: string;
  body: string[];
  button?: { label: string; url: string };
  afterButton?: string[];
}) => string;

/**
 * Destinatari staff da `ASSISTENZA_NOTIFICHE_A` (indirizzi separati da virgola).
 * ⚠️ Nessun ripiego su PLATFORM_STAFF_EMAILS, di proposito: quella lista dà i poteri di
 * staff, questa decide chi riceve email. Sono due domande diverse. E se la variabile manca
 * — in locale, nei collaudi, in CI — non parte niente: così chi fa girare i test non
 * riempie la casella dell'amministratore di ticket finti.
 */
export function destinatariAssistenza(valore: string | undefined): string[] {
  return [...new Set((valore ?? "").split(",").map((s) => s.trim().toLowerCase()).filter((s) => s.includes("@")))];
}

/** Anteprima del messaggio: l'email non è il posto dove leggere un thread intero. */
export function anteprima(testo: string, max = 600): string {
  const t = testo.trim();
  return t.length <= max ? t : `${t.slice(0, max).trimEnd()}…`;
}

const blocco = (testo: string) =>
  `<div style="border-left:3px solid #E6DCCB;padding:8px 14px;white-space:pre-wrap">${esc(anteprima(testo))}</div>`;

async function prova(invia: Invia, m: { to: string[]; subject: string; html: string }): Promise<boolean> {
  if (m.to.length === 0) return false;
  try {
    await invia(m);
    return true;
  } catch (e) {
    // Mai rilanciare: il ticket è già scritto. Resta una riga nel log per chi indaga.
    console.error(`[assistenza] email «${m.subject}» non inviata:`, e instanceof Error ? e.message : e);
    return false;
  }
}

export type Dipendenze = { invia: Invia; rendi: Rendi; baseUrl: string; staff: string[] };

/** Evento 1 — nuovo ticket: avvisa lo staff. */
export async function avvisaNuovoTicket(
  d: Dipendenze,
  t: { ticketId: string; oggetto: string; messaggio: string; autoreNome: string; autoreEmail: string },
): Promise<boolean> {
  const staff = d.staff.filter((e) => e !== t.autoreEmail.toLowerCase()); // chi scrive non riceve
  return prova(d.invia, {
    to: staff,
    subject: `Nuovo ticket: ${t.oggetto}`,
    html: d.rendi({
      previewText: `${t.autoreNome} ha aperto un ticket di assistenza.`,
      heading: "Nuovo ticket di assistenza",
      body: [
        `<strong>${esc(t.autoreNome)}</strong> (${esc(t.autoreEmail)}) ha aperto un ticket.`,
        `<strong>Oggetto:</strong> ${esc(t.oggetto)}`,
        blocco(t.messaggio),
      ],
      button: { label: "Apri nella coda staff", url: `${d.baseUrl}/staff/ticket/${t.ticketId}` },
    }),
  });
}

/** Evento 2 — l'utente risponde nel proprio ticket: avvisa lo staff. */
export async function avvisaRispostaUtente(
  d: Dipendenze,
  t: { ticketId: string; oggetto: string; messaggio: string; autoreNome: string; autoreEmail: string },
): Promise<boolean> {
  const staff = d.staff.filter((e) => e !== t.autoreEmail.toLowerCase());
  return prova(d.invia, {
    to: staff,
    subject: `Risposta dell'utente: ${t.oggetto}`,
    html: d.rendi({
      previewText: `${t.autoreNome} ha risposto in un ticket.`,
      heading: "L'utente ha risposto",
      body: [
        `<strong>${esc(t.autoreNome)}</strong> ha aggiunto un messaggio al ticket <strong>${esc(t.oggetto)}</strong>.`,
        blocco(t.messaggio),
      ],
      button: { label: "Apri nella coda staff", url: `${d.baseUrl}/staff/ticket/${t.ticketId}` },
    }),
  });
}

/**
 * Evento 3 — lo staff risponde: avvisa il proprietario del ticket.
 * Se chi risponde È il proprietario (uno staff che si è aperto un ticket da solo), niente.
 */
export async function avvisaRispostaStaff(
  d: Dipendenze,
  t: {
    ticketId: string;
    oggetto: string;
    messaggio: string;
    autoreId: string;
    proprietarioId: string;
    proprietarioNome: string;
    proprietarioEmail: string;
  },
): Promise<boolean> {
  if (t.autoreId === t.proprietarioId) return false;
  return prova(d.invia, {
    to: [t.proprietarioEmail],
    subject: `Risposta al tuo ticket: ${t.oggetto}`,
    html: d.rendi({
      previewText: "L'assistenza ha risposto al tuo ticket.",
      heading: "Hai una risposta dall'assistenza",
      body: [
        `Ciao <strong>${esc(t.proprietarioNome)}</strong>,`,
        `abbiamo risposto al tuo ticket <strong>${esc(t.oggetto)}</strong>.`,
        blocco(t.messaggio),
      ],
      button: { label: "Leggi e rispondi", url: `${d.baseUrl}/assistenza/${t.ticketId}` },
      afterButton: ["Per rispondere usa il pulsante: le risposte a questa email non vengono lette."],
    }),
  });
}
