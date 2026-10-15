// LISTINO APPROVATO (27/07/2026) — UNICA fonte di verità per setup/verifica/fine-lancio.
// attivoCents = prezzo di LANCIO incassato oggi; listinoCents = prezzo UFFICIALE (barrato).
// A fine lancio (_fine-lancio.ts) attivo diventa = listino. Prezzi IVA esclusa (Stripe Tax).
// Regola bundle (approvata dal cliente): stessa % di sconto dei bundle ufficiali,
// ricalcolata sui prezzi di lancio (−10/−22/−17/−27/−30%).

// FINE DEL PREZZO DI LANCIO: A ROTAZIONE MENSILE (scelta commerciale dell'utente, 05/10/2026).
// L'offerta vale fino all'ultimo giorno del mese in corso alle 23:59:59 ora di Roma, poi riparte
// sul mese successivo: i prezzi NON salgono. La stessa funzione guida la scadenza in pagina e la
// guardia di _fine-lancio.ts (che quindi gira solo con --anticipa, se un giorno si decide di
// chiudere davvero il lancio).
export function fineLancio(ora: number = Date.now()): number {
  const parti = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Rome", hourCycle: "h23",
        year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
      }).formatToParts(t).map((x) => [x.type, Number(x.value)]),
    );
    return p as Record<string, number>;
  };
  const { year, month } = parti(ora);
  // ultimo secondo del mese come se Roma fosse UTC, poi si toglie lo scarto reale di Roma in quell'istante
  const comeUtc = Date.UTC(year, month, 1) - 1000;
  const r = parti(comeUtc);
  const scarto = Date.UTC(r.year, r.month - 1, r.day, r.hour, r.minute, r.second) - comeUtc;
  return comeUtc - scarto;
}

// scontoAzienda: sconto aziendale PROPRIO del corso, fisso dal 2° iscritto della stessa azienda, al
// posto della regola generale −20%/−30% (corsi privacy obbligatori, prezzi decisi dal committente).
export type CorsoListino = { slug: string; attivoCents: number; listinoCents: number; scontoAzienda?: 20 | 40 };
export type BundleListino = {
  slug: string;
  title: string;
  description: string;
  kind: "fixed" | "pick_one";
  attivoCents: number;
  listinoCents: number;
  included: string[]; // slug corsi
  eligible?: string[]; // slug corsi a scelta (solo pick_one)
};

const S = {
  s19011: "iso-19011-2026-auditor-di-sistemi-di-gestione",
  s9001: "auditor-lead-auditor-iso-9001-sistemi-di-gestione-per-la-qualita",
  s14001: "auditor-iso-14001",
  s45001: "auditor-iso-45001-salute-e-sicurezza-sul-lavoro",
  s22000: "auditor-iso-22000",
  s50001: "auditor-iso-50001",
  s39001: "auditor-iso-39001",
  s37001: "auditor-iso-37001",
  s27001: "auditor-iso-27001",
  s42001: "auditor-iso-42001",
  s9001v26: "auditor-lead-auditor-iso-9001-2026-sistemi-di-gestione-per-la-qualita",
  agg14001: "aggiornamento-lead-auditor-iso-14001-2026",
  agg9001: "aggiornamento-iso-9001-2026-dalla-2015-alla-2026",
  fadai01: "corso-claude-ai-operativo-fad-ai-01-base-16h",
  fadai02: "corso-claude-ai-avanzato-fad-ai-02-avanzato-24h",
  fadesg02: "esg-manager-uni-pdr-109-1",
  fadeen02: "energy-manager-esperto-in-gestione-dell-energia",
  fadpdr125: "parita-di-genere-uni-pdr-125-2022",
  fadpas24000: "pas-24000-2022-sistema-di-gestione-sociale",
  fadcfp01: "carbon-footprint-misurare-calcolare-e-ridurre-le-emissioni",
  fadpriv01: "privacy-e-protezione-dei-dati-per-il-personale",
  fadpriv02: "aggiornamento-annuale-privacy-per-il-personale",
  fadpriv03: "privacy-per-manager-e-amministratori-di-sistema",
} as const;

export const CORSI: CorsoListino[] = [
  { slug: S.s19011, attivoCents: 34900, listinoCents: 34900 }, // corso d'ingresso: prezzo unico
  { slug: S.s9001, attivoCents: 49900, listinoCents: 64900 },
  { slug: S.s14001, attivoCents: 49900, listinoCents: 64900 },
  { slug: S.s45001, attivoCents: 49900, listinoCents: 64900 },
  { slug: S.s22000, attivoCents: 54900, listinoCents: 69900 },
  { slug: S.s50001, attivoCents: 54900, listinoCents: 69900 },
  { slug: S.s39001, attivoCents: 54900, listinoCents: 69900 },
  { slug: S.s37001, attivoCents: 59900, listinoCents: 74900 },
  { slug: S.s27001, attivoCents: 64900, listinoCents: 79900 },
  { slug: S.s42001, attivoCents: 74900, listinoCents: 89900 },
  { slug: S.agg14001, attivoCents: 17900, listinoCents: 17900 }, // aggiornamento 8h: prezzo unico
  // ISO 9001:2026 (sesta edizione). Stesso prezzo della 2015, che resta in catalogo e
  // acquistabile. NON ancora su Stripe e non ancora nei bundle: entrambe le cose sono
  // una decisione commerciale, da fare insieme alla pubblicazione dei due corsi.
  { slug: S.s9001v26, attivoCents: 49900, listinoCents: 64900 },
  { slug: S.agg9001, attivoCents: 17900, listinoCents: 17900 }, // aggiornamento 8h: prezzo unico
  { slug: S.fadai01, attivoCents: 39000, listinoCents: 49000 },
  { slug: S.fadai02, attivoCents: 59000, listinoCents: 79000 },
  // percorsi manageriali 40h (approvati 02/08): stesso prezzo per entrambi
  { slug: S.fadesg02, attivoCents: 35000, listinoCents: 45000 },
  { slug: S.fadeen02, attivoCents: 35000, listinoCents: 45000 },
  // parità di genere UNI/PdR 125 (8h, 05/10): 300 € con 549 € barrato
  { slug: S.fadpdr125, attivoCents: 30000, listinoCents: 54900 },
  // PAS 24000:2022 sistema di gestione sociale (24h, 13/10): 300 € con 549 € barrato
  { slug: S.fadpas24000, attivoCents: 30000, listinoCents: 54900 },
  // Carbon Footprint di organizzazione e di prodotto (24h, 13/10): 300 € con 549 € barrato
  { slug: S.fadcfp01, attivoCents: 30000, listinoCents: 54900 },
  // corsi privacy (15/10, prezzi del committente, nessun barrato). Aziende dal 2° dipendente:
  // 30 € per FAD-PRIV-01 (−40%) e 20 € per FAD-PRIV-02 (−20%); FAD-PRIV-03 con la regola generale.
  { slug: S.fadpriv01, attivoCents: 5000, listinoCents: 5000, scontoAzienda: 40 },
  { slug: S.fadpriv02, attivoCents: 2500, listinoCents: 2500, scontoAzienda: 20 },
  { slug: S.fadpriv03, attivoCents: 25000, listinoCents: 25000 },
];

// Nei pacchetti entra l'EDIZIONE CORRENTE di ogni norma: dalla 9001 è la 2026. La 2015 resta
// in catalogo e acquistabile da sola, ma non è quella che si consiglia a chi compra oggi.
// I pacchetti già venduti non cambiano: il provisioning crea le iscrizioni all'acquisto.
const LEAD_AUDITOR = [S.s9001v26, S.s14001, S.s45001, S.s22000, S.s50001, S.s39001, S.s37001, S.s27001, S.s42001];

export const BUNDLES: BundleListino[] = [
  {
    slug: "ingresso",
    title: "Pacchetto Ingresso",
    description: "ISO 19011 + un percorso Lead Auditor a scelta: la base dell'audit e la tua prima specializzazione.",
    kind: "pick_one",
    attivoCents: 74900,
    listinoCents: 89900,
    included: [S.s19011],
    eligible: LEAD_AUDITOR,
  },
  {
    slug: "qualita",
    title: "Pacchetto Qualità",
    description: "Il percorso completo per l'auditor dei sistemi di gestione: 19011, 9001:2026, 14001 e 45001.",
    kind: "fixed",
    attivoCents: 144000,
    listinoCents: 179000,
    included: [S.s19011, S.s9001v26, S.s14001, S.s45001],
  },
  {
    slug: "infosec",
    title: "Pacchetto Information Security",
    description: "Sicurezza delle informazioni e governance dell'IA: 19011, 27001 e 42001.",
    kind: "fixed",
    attivoCents: 144000,
    listinoCents: 169000,
    included: [S.s19011, S.s27001, S.s42001],
  },
  {
    slug: "master-auditor",
    title: "Master Auditor Evalis",
    description: "Tutti i 10 percorsi Auditor e Lead Auditor della piattaforma, nell'edizione corrente di ogni norma.",
    kind: "fixed",
    attivoCents: 399000,
    listinoCents: 499000,
    included: [S.s19011, ...LEAD_AUDITOR], // SENZA aggiornamento 14001 (deciso)
  },
  {
    slug: "claude",
    title: "Bundle Claude Base + Avanzato",
    description: "I due corsi Claude AI: dall'uso operativo al prompt engineering e alle automazioni.",
    kind: "fixed",
    attivoCents: 69000,
    listinoCents: 89000,
    included: [S.fadai01, S.fadai02],
  },
];

/** Coupon sconto azienda (checkout corsi singoli): ID fissi, creati idempotenti dal setup. */
export const COUPONS_AZIENDA = [
  { id: "azienda-20", percentOff: 20, name: "Sconto azienda −20% (dal 2° iscritto)" },
  { id: "azienda-30", percentOff: 30, name: "Sconto azienda −30% (dal 5° iscritto)" },
  { id: "azienda-40", percentOff: 40, name: "Prezzo aziende −40% (dal 2° iscritto, corsi privacy)" },
];
