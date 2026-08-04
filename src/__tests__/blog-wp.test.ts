// Test del client REST contro un WordPress FINTO (fetch sostituito). Nessuna rete.
//
// Verifica il tratto che i test puri non toccano: che la richiesta sia formata bene (`_embed`,
// stato, slug) e che quello che esce dal client sia gia' ripulito e riportato sul dominio
// pubblico — cioe' che i pezzi montati insieme si comportino come i pezzi presi da soli.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const CMS = "https://cms.evalisacademy.it";
const PUB = "https://evalisacademy.it";

const postFinto = {
  id: 7,
  slug: "articolo-di-prova",
  date_gmt: "2026-07-01T10:00:00",
  modified_gmt: "2026-07-02T11:00:00",
  title: { rendered: "Prova &amp; verifica" },
  excerpt: { rendered: "<p>Sommario.</p>" },
  content: {
    rendered:
      '<p>Link <a href="https://cms.evalisacademy.it/blog/x">interno</a>.</p>' +
      '<script>alert(1)</script>',
  },
  yoast_head_json: {
    title: "Titolo Yoast",
    description: "Descrizione Yoast",
    canonical: "https://cms.evalisacademy.it/articolo-di-prova/",
  },
  _embedded: {
    author: [{ slug: "giulia", name: "Giulia Marchetti", description: "Auditor." }],
    "wp:featuredmedia": [{ source_url: "https://cms.evalisacademy.it/wp-content/uploads/c.jpg" }],
    "wp:term": [[{ taxonomy: "category", name: "Qualit&agrave;" }]],
  },
};

/** Registra gli URL chiamati e risponde con quello che gli si dice. */
function fingiFetch(risposta: unknown, stato = 200) {
  const chiamate: string[] = [];
  const finto = vi.fn(async (url: string) => {
    chiamate.push(String(url));
    return {
      ok: stato >= 200 && stato < 300,
      status: stato,
      json: async () => risposta,
    } as Response;
  });
  vi.stubGlobal("fetch", finto);
  return chiamate;
}

let wp: typeof import("../features/blog/wp");

beforeEach(async () => {
  vi.stubEnv("BLOG_CMS_URL", CMS);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", PUB);
  wp = await import("../features/blog/wp");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("client REST del CMS", () => {
  it("chiede _embed e solo i pubblicati: autore, categoria e immagine in UNA chiamata", async () => {
    const chiamate = fingiFetch([postFinto]);
    await wp.elencoArticoli();
    expect(chiamate).toHaveLength(1);
    expect(chiamate[0]).toContain("/wp-json/wp/v2/posts");
    expect(chiamate[0]).toContain("_embed");
    expect(chiamate[0]).toContain("status=publish");
  });

  it("quello che esce e' gia' ripulito e sul dominio pubblico", async () => {
    fingiFetch([postFinto]);
    const [a] = await wp.elencoArticoli();
    expect(a.title).toBe("Prova & verifica");
    expect(a.category).toBe("Qualità");
    expect(a.autore?.nome).toBe("Giulia Marchetti");
    expect(a.image).toBe(`${PUB}/wp-content/uploads/c.jpg`);
    expect(a.content).toContain(`${PUB}/blog/x`);
    expect(a.content).not.toContain("cms.evalisacademy.it");
    expect(a.content).not.toContain("script");
    expect(a.date).toMatch(/^2026-07-01T/);
  });

  it("il canonical resta nostro anche quando Yoast dice il contrario", async () => {
    fingiFetch([postFinto]);
    const trovato = await wp.articoloPerSlug("articolo-di-prova");
    expect(trovato?.seo.canonical).toBe(`${PUB}/blog/articolo-di-prova`);
    expect(trovato?.seo.title).toBe("Titolo Yoast");
  });

  it("uno slug inesistente da' null, non un errore", async () => {
    fingiFetch([]);
    expect(await wp.articoloPerSlug("non-esiste")).toBeNull();
  });

  it("un CMS che risponde male fa fallire: meglio nessun blog che un blog vuoto", async () => {
    fingiFetch({ message: "errore" }, 500);
    await expect(wp.elencoArticoli()).rejects.toThrow(/irraggiungibile/i);
  });

  it("le bozze richiedono le credenziali: senza, si ferma invece di pubblicare nulla", async () => {
    vi.stubEnv("BLOG_CMS_USER", "");
    vi.stubEnv("BLOG_CMS_APP_PASSWORD", "");
    fingiFetch([postFinto]);
    await expect(wp.articoloPerSlug("x", { bozza: true })).rejects.toThrow(/APP_PASSWORD|credenzial/i);
  });
});
