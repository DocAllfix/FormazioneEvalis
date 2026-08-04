// Configurazione del blog headless. TUTTO da variabili d'ambiente, niente domini scritti nel
// codice: e' cio' che permettera' di riusare questo stesso modulo per un secondo sito
// (bilanciotool) cambiando solo la configurazione, senza toccare una riga.
//
// CMS_URL      = dove vive WordPress (es. https://cms.evalisacademy.it) — MAI mostrato ai visitatori
// SITO_PUBBLICO = il dominio che il pubblico vede (es. https://evalisacademy.it)
//
// La distinzione tra i due e' il cuore della sicurezza SEO di tutto l'impianto: ogni URL che
// arriva da WordPress va riscritto dal primo al secondo, altrimenti dichiariamo a Google che
// l'originale dei nostri articoli sta su un dominio chiuso al pubblico.

function senzaBarra(u: string): string {
  return u.replace(/\/+$/, "");
}

/** Indirizzo del CMS. Vuoto = blog non configurato (il codice chiamante lo tratta come tale). */
export function cmsUrl(): string {
  return senzaBarra(process.env.BLOG_CMS_URL ?? "");
}

/** Dominio pubblico su cui riscrivere ogni URL proveniente dal CMS. */
export function sitoPubblico(): string {
  return senzaBarra(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://evalisacademy.it",
  );
}

/** Credenziali per leggere le BOZZE (Application Password di WordPress). Solo lato server. */
export function credenzialiCms(): string | null {
  const u = process.env.BLOG_CMS_USER;
  const p = process.env.BLOG_CMS_APP_PASSWORD;
  if (!u || !p) return null;
  return "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
}

/** Il blog e' agganciato a un CMS? Finche' e' falso, il sito continua con la fonte precedente. */
export function blogConfigurato(): boolean {
  return cmsUrl().length > 0;
}
