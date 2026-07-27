// Dati societari e legali di riferimento — un'unica fonte, usata da footer e pagine legali.
// Evalis Academy è il marchio/piattaforma e-learning di Evalis S.R.L.
// NB: capitale sociale non pubblicato sul sito aziendale → da aggiungere se richiesto (visura).
// Contatti: usati quelli reali/funzionanti dell'azienda; sostituibili con indirizzi @evalisacademy.it
// quando saranno attivi i relativi mailbox/forwarder.

export const COMPANY = {
  brand: "Evalis Academy",
  legalName: "Evalis S.R.L.",
  address: "Via Sandro Botticelli 25, 81031 Aversa (CE), Italia",
  vat: "04868330616", // P.IVA e Codice Fiscale coincidono
  rea: "CE - 361943",
  pec: "evaliscert@pec.libero.it",
  email: "evaliscert@libero.it",
  privacyEmail: "evaliscert@libero.it",
  phone: "081 3992324",
  phone2: "+39 349 755 2716",
  site: "evalisacademy.it",
  parentSite: "evaliscert.it",
  lastUpdated: "27 luglio 2026",
} as const;

// Sub-processor / responsabili esterni del trattamento (stack reale della piattaforma).
export const SUBPROCESSORS: { name: string; role: string; region: string }[] = [
  { name: "Supabase", role: "Database e autenticazione", region: "Unione Europea" },
  { name: "Vercel", role: "Hosting dell'applicazione", region: "UE / SCC" },
  { name: "Cloudflare", role: "Distribuzione e streaming dei video dei corsi", region: "Rete globale / SCC" },
  { name: "Stripe", role: "Elaborazione dei pagamenti", region: "UE / SCC" },
  { name: "Resend", role: "Invio email transazionali", region: "Unione Europea (eu-west-1)" },
  { name: "Microsoft Azure OpenAI", role: "Assistente virtuale (chatbot) di supporto", region: "Italy North (UE)" },
];
