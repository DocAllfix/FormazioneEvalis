// Il parametro `next` porta l'utente, dopo login o registrazione, dove voleva andare: la scheda
// del corso di cui ha cliccato il prezzo, o il pacchetto scelto in landing. Siccome arriva
// dall'URL, chiunque può scriverci dentro: senza controllo diventa un redirect verso un sito
// esterno (open redirect). Prima il controllo era scritto a mano in un solo punto (Login.jsx);
// ora il `next` passa per registrazione, email di conferma e onboarding, quindi vive qui.
//
// Puro, niente dipendenze: lo usano server e client.

/**
 * Restituisce `raw` solo se è un percorso INTERNO al sito, altrimenti `fallback`.
 * Rifiuta: vuoto, `//host` (protocol-relative), `/\host` (i browser lo leggono come `//host`),
 * qualunque cosa contenga `://`, e i caratteri di controllo: il parser URL dei browser toglie
 * tabulazioni e a capo, quindi `"/\t/host"` diventerebbe `//host`.
 */
export function pathInterno(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.includes("://")) return fallback;
  return raw;
}

/** Link di registrazione che, a registrazione conclusa, riporta a `destinazione`. */
export function registratiPer(destinazione: string): string {
  return `/registrati?next=${encodeURIComponent(destinazione)}`;
}
