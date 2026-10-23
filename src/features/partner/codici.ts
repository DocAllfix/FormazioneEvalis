// CODICI PARTNER (richiesta del committente, 23/10/2026): chi si registra con il codice di un
// partner resta legato a lui, e il partner prende una provvigione su TUTTI gli acquisti di quella
// persona, compresi quelli che fa per i dipendenti se è il titolare di un'azienda. Non è uno
// sconto: il prezzo non cambia. La provvigione la calcola il committente dalla mail di vendita
// (notifica-vendita.ts), che riporta il partner di chi ha pagato.
//
// ⚠️ Solo codici conosciuti: un codice sbagliato in registrazione si RIFIUTA con un messaggio,
// perché un errore di battitura accettato in silenzio farebbe perdere la provvigione al partner
// senza che nessuno se ne accorga. Un partner nuovo si aggiunge qui.
export const CODICI_PARTNER = ["NGR"] as const;
export type CodicePartner = (typeof CODICI_PARTNER)[number];

/** Il codice ripulito (spazi tolti, maiuscolo); null se vuoto; "invalido" se non è di un partner. */
export function normalizzaCodicePartner(v: unknown): CodicePartner | null | "invalido" {
  if (v == null) return null;
  if (typeof v !== "string") return "invalido";
  const c = v.replace(/\s+/g, "").toUpperCase();
  if (!c) return null;
  return (CODICI_PARTNER as readonly string[]).includes(c) ? (c as CodicePartner) : "invalido";
}
