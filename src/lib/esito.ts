// Errori PER L'UTENTE nelle server action. In produzione Next sostituisce il messaggio di ogni
// eccezione lanciata da una server action con uno generico in inglese ("An error occurred in the
// Server Components render…"): lo studente non saprebbe mai, per esempio, che ha già il corso.
// Le situazioni previste (corso già posseduto, sottodominio occupato, invito scaduto…) lanciano
// ErroreUtente; l'azione le restituisce come valore con conEsito; il componente le riporta in
// eccezione con esegui, così i catch esistenti continuano a mostrare il messaggio.
// Ogni altro errore (guasto vero) resta un'eccezione come prima. Modulo puro: server e browser.

export class ErroreUtente extends Error {}

export type Esito<T> = { ok: true; dato: T } | { ok: false; errore: string };

export async function conEsito<T>(fn: () => Promise<T>): Promise<Esito<T>> {
  try {
    return { ok: true, dato: await fn() };
  } catch (e) {
    if (e instanceof ErroreUtente) return { ok: false, errore: e.message };
    throw e;
  }
}

export async function esegui<T>(p: Promise<Esito<T>>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.errore);
  return r.dato;
}
