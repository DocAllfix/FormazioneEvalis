// Formattazioni di PRESENTAZIONE condivise. Funzioni pure, nessun import: utilizzabili sia dai
// componenti server sia da quelli client.
//
// Ognuna nasce da una duplicazione reale trovata nel codice: le copie erano identiche e sono
// state spostate qui INVARIATE, per non cambiare di una virgola ciò che l'utente vede.

/**
 * Ora "HH:MM" nel fuso di Roma, uguale sul server e nel browser (il server gira in UTC).
 * Usata per dire allo studente da quando può ritentare un quiz non superato.
 */
export function oraRoma(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(new Date(d));
}

/**
 * Data breve italiana, con trattino lungo quando manca. Era duplicata identica in
 * `(app)/certificati/page.tsx` (`formatDate`) e `verify/[uuid]/page.tsx` (`fmtDate`).
 *
 * NB: `staff/certificati/page.tsx` NON usa questa funzione: là il formato ha opzioni proprie
 * (giorno/mese/anno estesi) ed è volutamente diverso.
 */
export function dataBreve(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("it-IT") : "—";
}

/**
 * Centesimi → prezzo in valuta, formato italiano. Era duplicata in
 * `components/catalog/catalog-browser.tsx` e `(app)/corsi/[id]/page.tsx`.
 *
 * `useGrouping` esplicito: il default italiano ("min2") NON separa le migliaia sotto le cinque
 * cifre, quindi un pacchetto da 3990 € uscirebbe "3990,00 €" invece di "3.990,00 €".
 *
 * La firma accetta `null` di proposito: la copia della pagina corso lo gestiva
 * (`currency ?? "eur"`) mentre quella del catalogo sarebbe andata in errore. Tenendo la
 * variante TOLLERANTE nessuno dei due chiamanti cambia comportamento.
 */
export function euro(cents: number, currency: string | null = "eur"): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: (currency ?? "eur").toUpperCase(),
    useGrouping: true,
  }).format(cents / 100);
}

/**
 * Secondi → "mm:ss" con zero iniziale. Era duplicata identica in `player/quiz-step.tsx` e
 * `player/slide-step.tsx` (entrambe chiamate `fmt`).
 *
 * È SOLO l'etichetta mostrata a schermo: il conteggio del tempo e i controlli antifrode
 * (tempo minimo, heartbeat) stanno altrove e non passano di qui.
 */
export function mmss(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
