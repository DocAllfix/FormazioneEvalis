// Forme dei dati del blog. `Articolo` ricalca ESATTAMENTE i campi che i componenti gia' usano
// (src/components/pages/Blog.jsx e BlogPost.jsx), piu' quelli che servono per autore e SEO:
// cosi' il passaggio a WordPress non costringe a riscrivere la presentazione.

/** Autore di un articolo: persona vera, con pagina dedicata (segnale E-E-A-T). */
export type Autore = {
  slug: string;
  nome: string;
  ruolo?: string;
  bio?: string;
  avatar?: string;
};

/** Un articolo pronto per la presentazione. `content` e' HTML GIA' SANIFICATO. */
export type Articolo = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  autore?: Autore;
  /** ISO 8601 (da WordPress). La vecchia fonte usava "12 Giu 2026": ora si formatta a display. */
  date: string;
  dateModified?: string;
  readTime: string;
  image: string;
  content: string;
};

/** Metadati SEO ricavati da Yoast, con gli URL GIA' riportati sul dominio pubblico. */
export type SeoArticolo = {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
};

// --- Forma (parziale) della risposta REST di WordPress ---------------------------------------
// Solo i campi che leggiamo davvero: il resto della risposta e' enorme e non ci interessa.

export type PostWP = {
  id: number;
  slug: string;
  date_gmt?: string;
  modified_gmt?: string;
  status?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  yoast_head_json?: Record<string, unknown>;
  _embedded?: {
    author?: Array<{
      slug?: string;
      name?: string;
      description?: string;
      avatar_urls?: Record<string, string>;
      /** WordPress non ha un campo "ruolo": lo aggiunge il nostro mu-plugin, a livello
       * principale (dentro `meta` il controller degli utenti non lo espone al pubblico). */
      evalis_ruolo?: string;
    }>;
    "wp:featuredmedia"?: Array<{ source_url?: string; alt_text?: string }>;
    "wp:term"?: Array<Array<{ taxonomy?: string; name?: string; slug?: string }>>;
  };
};
