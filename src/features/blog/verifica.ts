// Controlli automatici sul blog pubblicato. NUMERI CHE DEVONO TORNARE, non impressioni.
//
// Perche' non basta guardare il sito: le configurazioni che tengono in piedi il posizionamento
// non "avvengono" una volta, sono uno STATO. Un aggiornamento di Yoast puo' rimettere la sua
// sitemap; un redattore puo' incollare un link al CMS; una modifica al canonical passa
// inosservata per settimane e intanto Google deindicizza. Questi controlli girano dopo ogni
// pubblicazione e una volta al giorno, e se qualcosa e' rosso lo si sa subito.
//
// Legge le pagine COME LE VEDE UN VISITATORE (HTTP sul sito pubblicato), non i dati interni:
// un controllo che guarda le stesse strutture che genera la pagina non verifica niente.

export type Esito = {
  nome: string;
  ok: boolean;
  dettaglio: string;
};

type Opzioni = {
  /** Il sito pubblicato, es. https://evalisacademy.it */
  sito: string;
  /** Il CMS, es. https://cms.evalisacademy.it. Se assente si saltano i controlli sul CMS. */
  cms?: string;
  /** Quanti articoli aprire davvero. 0 = tutti. */
  massimoArticoli?: number;
};

const TIMEOUT_MS = 15_000;

async function prendi(url: string): Promise<{ stato: number; testo: string; header: Headers } | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
      headers: { "user-agent": "verifica-blog-evalis" },
    });
    return { stato: r.status, testo: await r.text(), header: r.headers };
  } catch {
    return null;
  }
}

function senzaBarra(u: string): string {
  return u.replace(/\/+$/, "");
}

function hostDi(u: string): string {
  return u.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

/** Gli URL degli articoli elencati nella sitemap del sito. */
export function urlArticoliDaSitemap(xml: string, sito: string): string[] {
  const pubblico = senzaBarra(sito);
  const loc = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return loc.filter((u) => u.startsWith(`${pubblico}/blog/`) && !u.includes("/blog/autore/"));
}

/** Il canonical dichiarato da una pagina. */
export function canonicalDi(html: string): string | undefined {
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return m?.[1];
}

/** Quanti blocchi JSON-LD di tipo Article ci sono nella pagina. */
export function quantiSchemiArticolo(html: string): number {
  const blocchi = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let n = 0;
  for (const b of blocchi) {
    // basta la presenza del tipo: qui interessa il DOPPIONE, non la validita' dello schema
    if (/"@type"\s*:\s*"(Article|BlogPosting|NewsArticle)"/.test(b[1])) n++;
  }
  return n;
}

/** I link alle pagine autore presenti nella pagina. */
export function autoriCitati(html: string, sito: string): string[] {
  const pubblico = senzaBarra(sito);
  const rel = [...html.matchAll(/href=["'](\/blog\/autore\/[a-z0-9-]+)["']/gi)].map((m) => `${pubblico}${m[1]}`);
  const ass = [...html.matchAll(new RegExp(`href=["'](${pubblico}/blog/autore/[a-z0-9-]+)["']`, "gi"))].map((m) => m[1]);
  return [...new Set([...rel, ...ass])];
}

/** Esegue tutti i controlli. Nessuna eccezione: un controllo che non riesce a girare e' rosso. */
export async function verificaBlog(opts: Opzioni): Promise<Esito[]> {
  const sito = senzaBarra(opts.sito);
  const cms = opts.cms ? senzaBarra(opts.cms) : undefined;
  const hostCms = cms ? hostDi(cms) : undefined;
  const esiti: Esito[] = [];
  const aggiungi = (nome: string, ok: boolean, dettaglio: string) => esiti.push({ nome, ok, dettaglio });

  // --- sitemap del sito -----------------------------------------------------------------
  const sitemap = await prendi(`${sito}/sitemap.xml`);
  if (!sitemap || sitemap.stato !== 200) {
    aggiungi("sitemap", false, `sitemap.xml non raggiungibile (${sitemap?.stato ?? "nessuna risposta"})`);
    return esiti; // senza sitemap non si sa cosa controllare: inutile proseguire
  }

  if (hostCms && sitemap.testo.includes(hostCms)) {
    aggiungi("sitemap", false, `la sitemap elenca URL del CMS (${hostCms})`);
  } else {
    aggiungi("sitemap", true, "nessun URL del CMS nella sitemap");
  }

  const urlArticoli = urlArticoliDaSitemap(sitemap.testo, sito);
  aggiungi(
    "conteggio",
    urlArticoli.length > 0,
    `${urlArticoli.length} articoli in sitemap${urlArticoli.length === 0 ? " — un blog vuoto non si pubblica" : ""}`,
  );

  // --- il CMS non deve essere indicizzabile ---------------------------------------------
  if (cms) {
    const radice = await prendi(`${cms}/`);
    const robots = radice?.header.get("x-robots-tag") ?? "";
    aggiungi(
      "cms-noindex",
      /noindex/i.test(robots),
      radice ? `x-robots-tag: ${robots || "(assente)"}` : "CMS non raggiungibile",
    );

    // la sitemap di Yoast manderebbe a Google una lista di URL del CMS in conflitto con la nostra
    for (const percorso of ["/wp-sitemap.xml", "/sitemap_index.xml"]) {
      const r = await prendi(`${cms}${percorso}`);
      aggiungi(
        `cms-sitemap${percorso}`,
        r?.stato === 404,
        `${percorso} risponde ${r?.stato ?? "nessuna risposta"} (atteso 404)`,
      );
    }
  }

  // --- ogni articolo, uno per uno --------------------------------------------------------
  const daControllare = opts.massimoArticoli ? urlArticoli.slice(0, opts.massimoArticoli) : urlArticoli;
  const pagineAutore = new Set<string>();
  const problemi: string[] = [];

  for (const url of daControllare) {
    const p = await prendi(url);
    if (!p || p.stato !== 200) {
      problemi.push(`${url} → ${p?.stato ?? "nessuna risposta"}`);
      continue;
    }
    const html = p.testo;

    const canonical = canonicalDi(html);
    if (!canonical) problemi.push(`${url}: canonical assente`);
    else if (!canonical.startsWith(sito)) problemi.push(`${url}: canonical su un altro dominio (${canonical})`);

    if (hostCms && html.includes(hostCms)) problemi.push(`${url}: contiene un riferimento a ${hostCms}`);

    if (!/<title>[^<]{3,}<\/title>/i.test(html)) problemi.push(`${url}: title mancante`);
    if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{10,}/i.test(html))
      problemi.push(`${url}: meta description mancante`);
    if (!/datePublished/.test(html)) problemi.push(`${url}: data di pubblicazione assente nello schema`);

    const schemi = quantiSchemiArticolo(html);
    if (schemi !== 1) problemi.push(`${url}: ${schemi} schemi Article (atteso 1)`);

    for (const a of autoriCitati(html, sito)) pagineAutore.add(a);
  }

  aggiungi(
    "articoli",
    problemi.length === 0,
    problemi.length === 0
      ? `${daControllare.length} articoli senza difetti`
      : problemi.slice(0, 20).join("; ") + (problemi.length > 20 ? ` … e altri ${problemi.length - 20}` : ""),
  );

  // --- nessun collegamento morto verso una pagina autore ---------------------------------
  const autoriRotti: string[] = [];
  for (const a of pagineAutore) {
    const r = await prendi(a);
    if (!r || r.stato !== 200) autoriRotti.push(`${a} → ${r?.stato ?? "nessuna risposta"}`);
  }
  aggiungi(
    "autori",
    autoriRotti.length === 0,
    autoriRotti.length === 0
      ? `${pagineAutore.size} pagine autore raggiungibili`
      : autoriRotti.join("; "),
  );

  return esiti;
}

/** Riepilogo leggibile, uguale sia a schermo sia nella mail di allarme. */
export function riepilogo(esiti: Esito[]): { ok: boolean; righe: string[] } {
  const righe = esiti.map((e) => `${e.ok ? "OK  " : "ROSSO"} ${e.nome}: ${e.dettaglio}`);
  return { ok: esiti.every((e) => e.ok), righe };
}
