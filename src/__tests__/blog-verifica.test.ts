// Test dei controlli automatici del blog, per SABOTAGGIO.
//
// Non basta che passino su un sito sano: un controllo che non fallisce mai non protegge da
// nulla. Ogni prova qui rompe una cosa sola e pretende che il controllo se ne accorga.

import { describe, it, expect, afterEach, vi } from "vitest";
import { verificaBlog, riepilogo, canonicalDi, quantiSchemiArticolo, urlArticoliDaSitemap } from "../features/blog/verifica";
import { SLUG_RIMOSSI } from "../features/blog/rimossi";

const SITO = "https://evalisacademy.it";
const CMS = "https://cms.evalisacademy.it";

type Pagina = { stato?: number; corpo?: string; header?: Record<string, string> };

function paginaArticolo(opts: {
  canonical?: string;
  extra?: string;
  schemi?: number;
  autore?: string;
} = {}) {
  const schemi = opts.schemi ?? 1;
  const ld = Array.from(
    { length: schemi },
    () => '<script type="application/ld+json">{"@type":"Article","datePublished":"2026-06-12"}</script>',
  ).join("");
  return `<!doctype html><html><head>
<title>Un articolo che parla di qualcosa</title>
<meta name="description" content="Una descrizione lunga abbastanza da contare." />
<link rel="canonical" href="${opts.canonical ?? `${SITO}/blog/uno`}" />
${ld}
</head><body>
<a href="/blog/autore/${opts.autore ?? "giulia"}">Giulia Marchetti</a>
<p>Testo dell'articolo.</p>
${opts.extra ?? ""}
</body></html>`;
}

const SITEMAP = `<?xml version="1.0"?><urlset>
<url><loc>${SITO}/</loc></url>
<url><loc>${SITO}/blog</loc></url>
<url><loc>${SITO}/blog/uno</loc></url>
<url><loc>${SITO}/blog/due</loc></url>
<url><loc>${SITO}/blog/autore/giulia</loc></url>
</urlset>`;

/** Un sito finto: mappa URL → risposta. Quello che non c'e' risponde 404. */
function sitoFinto(pagine: Record<string, Pagina>) {
  const base: Record<string, Pagina> = {
    [`${SITO}/sitemap.xml`]: { corpo: SITEMAP },
    [`${SITO}/blog/uno`]: { corpo: paginaArticolo() },
    [`${SITO}/blog/due`]: { corpo: paginaArticolo({ canonical: `${SITO}/blog/due` }) },
    [`${SITO}/blog/autore/giulia`]: { corpo: "<html>Giulia</html>" },
    [`${CMS}/`]: { corpo: "wp", header: { "x-robots-tag": "noindex, nofollow" } },
    [`${CMS}/wp-sitemap.xml`]: { stato: 404 },
    [`${CMS}/sitemap_index.xml`]: { stato: 404 },
  };
  // i vecchi articoli eliminati rispondono 410: e' lo stato corretto dopo il passaggio
  for (const slug of SLUG_RIMOSSI) base[`${SITO}/blog/${slug}`] = { stato: 410 };
  const tutte = { ...base, ...pagine };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const p = tutte[String(url)];
      if (!p) return { status: 404, text: async () => "", headers: new Headers() } as Response;
      return {
        status: p.stato ?? 200,
        text: async () => p.corpo ?? "",
        headers: new Headers(p.header ?? {}),
      } as Response;
    }),
  );
}

async function esitoDi(nome: string, pagine: Record<string, Pagina> = {}) {
  sitoFinto(pagine);
  const esiti = await verificaBlog({ sito: SITO, cms: CMS });
  return esiti.find((e) => e.nome === nome);
}

afterEach(() => vi.unstubAllGlobals());

describe("lettura delle pagine", () => {
  it("il canonical si legge in entrambi gli ordini degli attributi", () => {
    expect(canonicalDi('<link rel="canonical" href="https://x/y" />')).toBe("https://x/y");
    expect(canonicalDi('<link href="https://x/y" rel="canonical" />')).toBe("https://x/y");
    expect(canonicalDi("<html></html>")).toBeUndefined();
  });

  it("gli schemi Article si contano, anche quando sono due", () => {
    expect(quantiSchemiArticolo(paginaArticolo())).toBe(1);
    expect(quantiSchemiArticolo(paginaArticolo({ schemi: 2 }))).toBe(2);
  });

  it("dalla sitemap escono gli articoli, non le pagine autore", () => {
    const url = urlArticoliDaSitemap(SITEMAP, SITO);
    expect(url).toEqual([`${SITO}/blog/uno`, `${SITO}/blog/due`]);
  });
});

describe("un sito sano passa", () => {
  it("nessun controllo rosso", async () => {
    sitoFinto({});
    const { ok, righe } = riepilogo(await verificaBlog({ sito: SITO, cms: CMS }));
    expect(righe.filter((r) => r.startsWith("ROSSO"))).toEqual([]);
    expect(ok).toBe(true);
  });
});

describe("sabotaggi: ognuno DEVE far fallire il controllo", () => {
  it("canonical puntato al CMS", async () => {
    const e = await esitoDi("articoli", {
      [`${SITO}/blog/uno`]: { corpo: paginaArticolo({ canonical: `${CMS}/uno/` }) },
    });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toMatch(/canonical/i);
  });

  it("un link al CMS lasciato nel testo", async () => {
    const e = await esitoDi("articoli", {
      [`${SITO}/blog/uno`]: {
        corpo: paginaArticolo({ extra: `<a href="${CMS}/blog/altro">altro articolo</a>` }),
      },
    });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toContain("cms.evalisacademy.it");
  });

  it("schema Article in doppio (il nostro piu' quello di Yoast)", async () => {
    const e = await esitoDi("articoli", {
      [`${SITO}/blog/uno`]: { corpo: paginaArticolo({ schemi: 2 }) },
    });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toMatch(/2 schemi/);
  });

  it("meta description sparita", async () => {
    const e = await esitoDi("articoli", {
      [`${SITO}/blog/uno`]: { corpo: paginaArticolo().replace(/<meta name="description"[^>]*>/, "") },
    });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toMatch(/description/i);
  });

  it("un articolo in sitemap che risponde 404", async () => {
    const e = await esitoDi("articoli", { [`${SITO}/blog/due`]: { stato: 404 } });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toContain("404");
  });

  it("autore citato senza pagina: collegamento morto", async () => {
    const e = await esitoDi("autori", {
      [`${SITO}/blog/uno`]: { corpo: paginaArticolo({ autore: "inesistente" }) },
    });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toContain("inesistente");
  });

  it("il CMS torna indicizzabile", async () => {
    const e = await esitoDi("cms-noindex", { [`${CMS}/`]: { corpo: "wp", header: {} } });
    expect(e?.ok).toBe(false);
  });

  it("Yoast rimette la sua sitemap", async () => {
    const e = await esitoDi("cms-sitemap/wp-sitemap.xml", {
      [`${CMS}/wp-sitemap.xml`]: { corpo: "<urlset/>" },
    });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toContain("200");
  });

  it("la sitemap del sito elenca URL del CMS", async () => {
    const e = await esitoDi("sitemap", {
      [`${SITO}/sitemap.xml`]: { corpo: SITEMAP.replace(`${SITO}/blog/due`, `${CMS}/blog/due`) },
    });
    expect(e?.ok).toBe(false);
  });

  it("un giro a vuoto: sitemap senza nemmeno un articolo", async () => {
    const e = await esitoDi("conteggio", {
      [`${SITO}/sitemap.xml`]: { corpo: `<urlset><url><loc>${SITO}/</loc></url></urlset>` },
    });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toMatch(/vuoto/i);
  });

  it("un vecchio articolo torna 404 invece di 410: resterebbe mesi nell'indice", async () => {
    const e = await esitoDi("vecchi-url", { [`${SITO}/blog/${SLUG_RIMOSSI[0]}`]: { stato: 404 } });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toContain("404");
  });

  it("un vecchio articolo torna a rispondere 200: e' rivissuto senza che nessuno lo sappia", async () => {
    const e = await esitoDi("vecchi-url", {
      [`${SITO}/blog/${SLUG_RIMOSSI[0]}`]: { corpo: paginaArticolo() },
    });
    expect(e?.ok).toBe(false);
  });

  it("un articolo pubblicato viene COPERTO da un 410", async () => {
    const conflitto = `<?xml version="1.0"?><urlset>
      <url><loc>${SITO}/blog/uno</loc></url>
      <url><loc>${SITO}/blog/${SLUG_RIMOSSI[0]}</loc></url>
    </urlset>`;
    const e = await esitoDi("conflitto-rimossi", { [`${SITO}/sitemap.xml`]: { corpo: conflitto } });
    expect(e?.ok).toBe(false);
    expect(e?.dettaglio).toContain(SLUG_RIMOSSI[0]);
  });

  it("la sitemap non risponde: si ferma subito invece di dire che va tutto bene", async () => {
    sitoFinto({ [`${SITO}/sitemap.xml`]: { stato: 500 } });
    const { ok } = riepilogo(await verificaBlog({ sito: SITO, cms: CMS }));
    expect(ok).toBe(false);
  });
});
