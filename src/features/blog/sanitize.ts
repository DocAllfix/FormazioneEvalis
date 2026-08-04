// Sanificazione dell'HTML che arriva da WordPress.
//
// PERCHE' SERVE: la vecchia fonte era Markdown reso da react-markdown, che per costruzione non
// esegue script. WordPress invece restituisce HTML gia' composto, che finirebbe nella pagina
// cosi' com'e'. Senza sanificazione, chiunque abbia accesso all'editor — o chiunque riesca a
// entrarci — puo' iniettare uno <script> nel sito pubblico, che gira sul dominio dove i nostri
// utenti sono autenticati.
//
// La lista bianca e' volutamente STRETTA: si concede quello che serve a un articolo, non tutto
// cio' che WordPress sa produrre. Aggiungere un tag e' una decisione consapevole.

import sanitizeHtml from "sanitize-html";

const OPZIONI: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h2", "h3", "h4",           // niente h1: quello della pagina e' il titolo dell'articolo
    "strong", "b", "em", "i", "u", "s", "mark", "sup", "sub",
    "ul", "ol", "li",
    "blockquote", "cite",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "code", "pre",
    "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "srcset", "alt", "width", "height", "loading", "decoding"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    // le classi di WordPress servono agli stili dei blocchi (allineamenti, dimensioni)
    "*": ["class", "id"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // niente data: URI nelle immagini: e' una via classica per infilare payload
  allowedSchemesByTag: { img: ["http", "https"] },
  transformTags: {
    // ogni link esterno esce in sicurezza: senza noopener la pagina aperta puo' manipolare
    // quella di partenza
    a: (nomeTag, attribs) => {
      const href = attribs.href ?? "";
      const esterno = /^https?:\/\//i.test(href);
      return {
        tagName: nomeTag,
        attribs: esterno
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer" }
          : { ...attribs },
      };
    },
    // le immagini degli articoli si caricano pigramente: non competono col contenuto sopra
    img: (nomeTag, attribs) => ({
      tagName: nomeTag,
      attribs: { ...attribs, loading: "lazy", decoding: "async" },
    }),
  },
  // commenti HTML fuori: a volte contengono note interne dell'editor
  allowedIframeHostnames: [],
};

/** HTML dell'articolo ripulito e pronto da inserire nella pagina. */
export function sanificaHtml(html: string | undefined | null): string {
  if (!html) return "";
  return sanitizeHtml(html, OPZIONI);
}

/** Testo semplice da un frammento HTML (per excerpt e conteggio parole). */
export function soloTesto(html: string | undefined | null): string {
  if (!html) return "";
  const senzaTag = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  return senzaTag.replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
