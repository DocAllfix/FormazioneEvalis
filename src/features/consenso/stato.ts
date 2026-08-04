// Lo stato del consenso ai cookie. Vive nel browser e comanda TUTTO il resto: finche' non c'e'
// un "si" esplicito, nessuno script di misurazione parte.
//
// Perche' non basta un avviso. In Italia il Garante sanziona chi carica strumenti di analisi
// prima del consenso, e la nostra stessa informativa dichiara che "qualora venissero introdotti
// cookie di profilazione, verra' richiesto il consenso tramite banner". Il percorso l'abbiamo
// gia' scritto noi: qui si rispetta.
//
// Tre regole che il Garante e l'EDPB chiedono esplicitamente e che qui sono vincoli di codice:
//   1. rifiutare dev'essere facile quanto accettare (un clic, allo stesso livello)
//   2. nessuna casella pre-spuntata: si parte da tutto NEGATO
//   3. la scelta si deve poter cambiare in qualsiasi momento

export type Categoria = "necessari" | "statistiche";

export type Consenso = {
  /** I tecnici non si negano: senza, il sito non funziona. Sono sempre veri. */
  necessari: true;
  statistiche: boolean;
  /** Quando e' stata espressa la scelta (ISO). Serve a dimostrare che c'e' stata. */
  quando: string;
  /** Versione dell'informativa accettata: se cambia, si richiede il consenso. */
  versione: number;
};

/** Alzarla quando l'informativa cambia in modo sostanziale: il banner ricompare a tutti. */
export const VERSIONE_INFORMATIVA = 2;

const CHIAVE = "evalis-consenso-cookie";

/** Evento interno: il banner e il caricatore di GA4 si parlano attraverso questo. */
export const EVENTO_CONSENSO = "evalis:consenso";

export function leggiConsenso(): Consenso | null {
  if (typeof window === "undefined") return null;
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return null;
    const c = JSON.parse(grezzo) as Consenso;
    // un'informativa nuova annulla il consenso vecchio: e' cambiato cio' che si accettava
    if (c?.versione !== VERSIONE_INFORMATIVA) return null;
    return c;
  } catch {
    return null;
  }
}

export function salvaConsenso(statistiche: boolean): Consenso {
  const c: Consenso = {
    necessari: true,
    statistiche,
    quando: new Date().toISOString(),
    versione: VERSIONE_INFORMATIVA,
  };
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(c));
  } catch {
    /* navigazione privata o storage pieno: la scelta vale per questa sessione */
  }
  applicaConsenso(c);
  window.dispatchEvent(new CustomEvent(EVENTO_CONSENSO, { detail: c }));
  return c;
}

export function revocaConsenso(): void {
  try {
    localStorage.removeItem(CHIAVE);
  } catch {
    /* ignora */
  }
  applicaConsenso(null);
  window.dispatchEvent(new CustomEvent(EVENTO_CONSENSO, { detail: null }));
}

/**
 * Comunica la scelta a Google (Consent Mode v2).
 *
 * I quattro parametri partono NEGATI dal layout, prima ancora che GA4 esista; qui si aggiornano.
 * Dal 15 giugno 2026 il consenso trasmesso da qui e' l'unica fonte di verita' per GA4: senza,
 * i dati non vengono nemmeno raccolti.
 */
export function applicaConsenso(c: Consenso | null): void {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  function gtag(...args: unknown[]) {
    w.dataLayer.push(args);
  }
  gtag("consent", "update", {
    analytics_storage: c?.statistiche ? "granted" : "denied",
    // pubblicita' e personalizzazione restano negate SEMPRE: non ne facciamo
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}
