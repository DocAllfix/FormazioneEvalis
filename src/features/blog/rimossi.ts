// Gli articoli della vecchia fonte, eliminati con il passaggio a WordPress.
//
// PERCHE' 410 E NON 404. Erano indicizzati. Un 404 dice a Google "non lo trovo adesso", e
// l'URL resta nell'indice per mesi mentre il crawler continua a ripassare. Il 410 dice
// "rimosso, definitivamente": Google lo toglie in fretta e smette di chiedere. Per contenuto
// eliminato e senza sostituto e' il trattamento corretto.
//
// Nessuno di questi aveva traffico — export Search Console del 04/08/2026, tre mesi:
// l'intera sezione /blog aveva ZERO clic e 8 impressioni. Non c'era nulla da preservare con
// un 301, e mandare tutti a /blog sarebbe stato un reindirizzamento fasullo verso una pagina
// che non risponde alla domanda di chi arrivava.
//
// ⚠️ Se un giorno il redattore ripubblicasse un articolo con uno di questi slug, il 410
// coprirebbe l'articolo vero. Per questo `_verifica-blog.ts` controlla che nessuno di questi
// compaia in sitemap: il conflitto si scopre da solo invece che dopo settimane.

export const SLUG_RIMOSSI: readonly string[] = [
  "auditor-iso-opportunita-2026",
  "competenze-tecniche-certificate",
  "formazione-bancaria-2026",
  "esame-online-evalis",
  "certificato-qr-verificabile",
  "mestieri-specialistici-certificazione",
  // NB: "guida-esame-iso-9001" NON e' in elenco. Esisteva prima ed esiste ancora su WordPress:
  // metterlo qui coprirebbe un articolo pubblicato.
];

/** L'articolo a questo percorso e' stato rimosso per sempre? */
export function eRimosso(percorso: string): boolean {
  const m = percorso.match(/^\/blog\/([a-z0-9-]+)\/?$/i);
  return m ? SLUG_RIMOSSI.includes(m[1].toLowerCase()) : false;
}
