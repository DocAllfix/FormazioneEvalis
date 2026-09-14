// Controllo d'identità PRIMA di ogni collaudo nel browser.
//
// ⚠️ Perché esiste. Su questa macchina girano più progetti e più sessioni, e tutti partono
// sulla 3000. È successo davvero: il server di Evalis era spento, un altro prodotto aveva
// preso la porta, e cinque e2e sono falliti con «elemento non trovato». Quel messaggio manda
// a cercare una regressione nel proprio codice, e la regressione non c'è: è la pagina che è
// di un'altra applicazione.
// Un collaudo che gira sull'app sbagliata non deve poter diventare né verde né rosso: si ferma.

const ATTESO = /Evalis Academy/i;

export default async function pretendiAppGiusta(): Promise<void> {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  let html: string;
  try {
    const r = await fetch(base, { redirect: "follow" });
    html = await r.text();
  } catch (e) {
    throw new Error(
      `Nessuna applicazione risponde su ${base}. Avvia il server ` +
        `(npm run dev) oppure indica la porta giusta con PLAYWRIGHT_BASE_URL.\n${e}`,
    );
  }
  const titolo = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "(nessun titolo)";
  if (!ATTESO.test(html)) {
    throw new Error(
      `Su ${base} NON c'è Evalis Academy: il titolo della pagina è «${titolo}».\n` +
        `Probabilmente un altro progetto ha preso la porta. Avvia Evalis su una porta tua ` +
        `(npm run dev -- -p 3100) e lancia i collaudi con PLAYWRIGHT_BASE_URL=http://localhost:3100.`,
    );
  }
}
