// Test puri dello strato blog: mappatura del post WordPress, riscrittura degli URL sul dominio
// pubblico e sanificazione dell'HTML. Nessuna rete.
//
// Non verificano "che funzioni" ma che i tre modi di rovinare il posizionamento siano bloccati:
// canonical sul dominio del CMS, link al CMS dentro il testo, script iniettato dall'editor.

import { describe, it, expect } from "vitest";
import { mappaPost, tempoDiLettura, decodificaEntita, categoriaDaPost } from "../features/blog/mappa";
import { dataItaliana } from "../features/blog/data";
import { seoDaYoast, riportaSuPubblico, contieneRiferimentiAlCms } from "../features/blog/seo";
import { sanificaHtml, soloTesto } from "../features/blog/sanitize";
import type { PostWP } from "../features/blog/tipi";

const CMS = "https://cms.evalisacademy.it";
const PUB = "https://evalisacademy.it";

const postFinto: PostWP = {
  id: 12,
  slug: "guida-esame-iso-9001",
  date_gmt: "2026-06-12T09:30:00",
  modified_gmt: "2026-07-01T08:00:00",
  title: { rendered: "Come prepararsi all&#8217;esame ISO 9001" },
  excerpt: { rendered: "<p>Tutto quello che devi sapere.</p>" },
  content: {
    rendered:
      '<p>Vedi anche <a href="https://cms.evalisacademy.it/blog/altro">questo articolo</a>.</p>' +
      '<img src="https://cms.evalisacademy.it/wp-content/uploads/foto.jpg" alt="foto" />' +
      '<script>alert("xss")</script>' +
      '<p onclick="rubaDati()">Paragrafo con gestore di eventi.</p>' +
      '<a href="https://esterno.example/x">link esterno</a>',
  },
  yoast_head_json: {
    title: "Titolo da Yoast",
    description: "Descrizione da Yoast",
    canonical: "https://cms.evalisacademy.it/guida-esame-iso-9001/",
    og_image: [{ url: "https://cms.evalisacademy.it/wp-content/uploads/og.jpg" }],
  },
  _embedded: {
    author: [{ slug: "giulia", name: "Giulia Marchetti", description: "Auditor ISO 9001." }],
    "wp:featuredmedia": [{ source_url: "https://cms.evalisacademy.it/wp-content/uploads/cover.jpg" }],
    "wp:term": [[{ taxonomy: "post_tag", name: "tag" }], [{ taxonomy: "category", name: "ISO 9001" }]],
  },
};

describe("riscrittura URL sul dominio pubblico", () => {
  it("un URL del CMS diventa lo stesso percorso sul dominio pubblico", () => {
    expect(riportaSuPubblico(`${CMS}/blog/x`, CMS, PUB)).toBe(`${PUB}/blog/x`);
  });

  it("un URL di terzi resta intatto", () => {
    expect(riportaSuPubblico("https://esterno.example/x", CMS, PUB)).toBe("https://esterno.example/x");
  });

  it("il canonical NON e' mai quello di Yoast: lo decide il frontend", () => {
    const seo = seoDaYoast(postFinto.yoast_head_json, { slug: postFinto.slug, cms: CMS, pubblico: PUB });
    expect(seo.canonical).toBe(`${PUB}/blog/guida-esame-iso-9001`);
    expect(seo.canonical).not.toContain("cms.");
  });

  it("le immagini escono sul dominio pubblico: /wp-content/uploads e' servito da noi", () => {
    // la regola di riscrittura in next.config.ts fa di questo indirizzo un URL vero, che
    // Vercel serve prendendo il file dal CMS e tenendolo in cache. Se un giorno quella regola
    // sparisse, questi indirizzi darebbero 404 e gli articoli mostrerebbero riquadri vuoti.
    const a = mappaPost(postFinto, { cms: CMS, pubblico: PUB });
    expect(a.image).toBe(`${PUB}/wp-content/uploads/cover.jpg`);
    expect(a.content).toContain(`${PUB}/wp-content/uploads/foto.jpg`);
    expect(a.content).not.toContain("cms.");
  });

  it("anche l'immagine social esce sul dominio pubblico", () => {
    const seo = seoDaYoast(postFinto.yoast_head_json, { slug: postFinto.slug, cms: CMS, pubblico: PUB });
    expect(seo.ogImage).toBe(`${PUB}/wp-content/uploads/og.jpg`);
  });
});

describe("sanificazione dell'HTML dell'editor", () => {
  it("uno <script> iniettato sparisce", () => {
    expect(sanificaHtml('<p>ok</p><script>alert(1)</script>')).not.toContain("script");
  });

  it("i gestori di eventi inline spariscono", () => {
    expect(sanificaHtml('<p onclick="rubaDati()">testo</p>')).not.toContain("onclick");
  });

  it("il contenuto legittimo resta", () => {
    const out = sanificaHtml("<h2>Titolo</h2><p><strong>grassetto</strong></p><ul><li>voce</li></ul>");
    expect(out).toContain("<h2>");
    expect(out).toContain("<strong>");
    expect(out).toContain("<li>");
  });

  it("i link esterni escono con noopener", () => {
    const out = sanificaHtml('<a href="https://esterno.example/x">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});

describe("mappatura del post", () => {
  const a = mappaPost(postFinto, { cms: CMS, pubblico: PUB });

  it("nel contenuto pubblicato NON resta un solo riferimento al CMS", () => {
    expect(contieneRiferimentiAlCms(a.content, CMS)).toBe(false);
    expect(a.content).toContain(`${PUB}/blog/altro`);
  });

  it("lo script iniettato non arriva nella pagina", () => {
    expect(a.content).not.toContain("script");
    expect(a.content).not.toContain("onclick");
  });

  it("titolo: le entita' HTML tornano caratteri veri", () => {
    // &#8217; e' l'apostrofo TIPOGRAFICO (U+2019), non quello dritto: giusto cosi'
    expect(a.title).toBe("Come prepararsi all’esame ISO 9001");
  });

  it("categoria: prende la categoria, non il tag", () => {
    expect(categoriaDaPost(postFinto)).toBe("ISO 9001");
  });

  it("autore e immagine di copertina arrivano dal blocco _embedded", () => {
    expect(a.autore?.nome).toBe("Giulia Marchetti");
    expect(a.autore?.slug).toBe("giulia");
    expect(a.image).toBe(`${PUB}/wp-content/uploads/cover.jpg`);
  });

  it("la data e' ISO (non piu' la stringa italiana della vecchia fonte)", () => {
    expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(dataItaliana(a.date)).toBe("12 Giu 2026");
  });

  it("il tempo di lettura si calcola: in WordPress quel campo non esiste", () => {
    expect(a.readTime).toMatch(/^\d+ min$/);
    expect(tempoDiLettura("<p>" + "parola ".repeat(400) + "</p>")).toBe("2 min");
  });
});

describe("utilita'", () => {
  it("soloTesto toglie i tag e normalizza gli spazi", () => {
    expect(soloTesto("<p>uno   <b>due</b></p>")).toBe("uno due");
  });

  it("decodificaEntita gestisce le entita' numeriche e nominali", () => {
    // le accentate contano: WordPress italiano le salva cosi' di continuo
    expect(decodificaEntita("Cos&#8217;&egrave; &amp; perch&eacute;")).toBe("Cos’è & perché");
    expect(decodificaEntita("a &amp; b")).toBe("a & b");
    expect(decodificaEntita("Qualit&agrave; e s&igrave;")).toBe("Qualità e sì");
    // un'entita' sconosciuta resta com'e', non sparisce
    expect(decodificaEntita("&sconosciuta; x")).toBe("&sconosciuta; x");
  });
});
