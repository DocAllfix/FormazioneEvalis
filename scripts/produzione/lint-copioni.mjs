// Linter copioni — la precisione redazionale diventa verificabile a macchina (Fase 0.5).
// BLOCCANTE prima di ogni generazione: exit 1 se ci sono ERRORI.
//
// ERRORI (bloccanti):
//   E1  ID non canonico / duplicato / di un altro corso
//   E2  "audit"/"auditor" nelle PRIME 10 PAROLE del testo slide (parola ambigua a freddo:
//       il TTS decide la pronuncia dal contesto precedente — regola nata dal difetto v12)
//   E3  numero/sigla nel testo NON coperto dal glossario (il TTS inventerebbe la lettura)
//   E4  caratteri anomali (simboli, emoji, markup) che il TTS leggerebbe o storpierebbe
//   E5  ANTI-VERBATIM: sequenza di >=8 parole in comune col testo della norma
//       (testonorme/*<corso>*.txt) — protezione copyright verificata a macchina
//   E6  BUDGET ASIMMETRICO: parole del modulo fuori da [-5%, +2%] del budget (minuti
//       modulo × 60 × 2,35 p/s misurati) — decisione utente 2026-07-04: meglio corti
//       che lunghi. Guardia di CORSO: somma stimata >= minuti legali +1% (bloccante,
//       solo su lint dell'intero corso con budget.minutiLegali presente)
//   E7  COPERTURA: concetto chiave del modulo (produzione/<corso>/copertura.json,
//       checklist derivata dallo skeleton) assente dai copioni del modulo
//   E8  ANTI-FOTOCOPIA CROSS-CORSO: sequenza >=10 parole in comune coi copioni di un
//       ALTRO corso (i moduli armonizzati si somigliano per natura: la struttura può,
//       il testo NO)
//   Q*  QUIZ-LINT (QUIZ-STANDARD.md): banca >=10, 4 opzioni, corretta valida, mix tipi
//       ~40/40/20, slide di tracciabilità esistente, posizione risposta variata
// AVVISI (non bloccanti):
//   W1  frase oltre 35 parole (prosodia faticosa; la ricetta la spezza comunque a 213 char)
//   W2  frase lunga (>15 parole) senza virgole (respiro assente)
//
// Uso: node scripts/produzione/lint-copioni.mjs <corso> [--modulo mNN]

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { ROOT, dirs, readJson, slideIds } from "./lib.mjs";

const PAROLE_AL_SECONDO = 2.35; // misurato: M1 reale, 8.044 parole = 57,0 min (2026-07-03)
const NGRAM_VERBATIM = 8;

const corso = process.argv[2];
const modIx = process.argv.indexOf("--modulo");
const modulo = modIx !== -1 ? process.argv[modIx + 1] : null;
if (!corso) {
  console.error("Uso: node scripts/produzione/lint-copioni.mjs <corso> [--modulo mNN]");
  process.exit(2);
}

const d = dirs(corso);
const copioni = readJson(d.copioni);
const glossario = readJson(d.glossario, { map: {} });

let errori = 0, avvisi = 0;
const err = (id, code, msg) => { console.log(`  ERRORE ${code} [${id}] ${msg}`); errori++; };
const warn = (id, code, msg) => { console.log(`  avviso ${code} [${id}] ${msg}`); avvisi++; };

// E1 — validazione ID (lancia su formato/duplicati/corso sbagliato)
try {
  slideIds(copioni, corso);
} catch (e) {
  err("-", "E1", e.message);
}

const AMBIGUE = /\b(audit|auditor)\b/i;

// E9 — parole SEMPRE accentate in italiano: la forma piana è un errore certo che la
// voce sintetica leggerebbe male. Esclusi i casi ambigui (saranno/sarà, meta/metà,
// efficacia sempre piana, subito/subìto, ecc.).
// escluse le parole con forma piana valida comune: terra(suolo), meta(obiettivo),
// pero(albero), unita(participio "unita"), sara(nome) — per non bloccare su falsi allarmi
const ACCENTI_MANCANTI = /\b(perche|poiche|benche|affinche|giacche|sicche|anziche|dacche|cosi|piu|gia|puo|verra|andra|dara|fara|potra|dovra|vorra|avra|dira|sapra|vivra|terra(?=\s+(conto|presente|fede))|cioe|percio|finche|nonche|citta|qualita|attivita|possibilita|realta|societa|verita|liberta|responsabilita|autorita|priorita|maturita|complessita|conformita|proprieta|universita|identita|entita|novita|unanimita|generalita|specificita|efficacia(?=[a-z])|virtu|tribu|caffe|ahime|cosicche|dappertutto(?!x))\b/gi;
const _ACC = { perche: "perché", poiche: "poiché", benche: "benché", affinche: "affinché",
  giacche: "giacché", sicche: "sicché", cosi: "così", piu: "più", gia: "già", puo: "può",
  sara: "sarà", verra: "verrà", terra: "terrà", andra: "andrà", dara: "darà", fara: "farà",
  stara: "starà", potra: "potrà", dovra: "dovrà", vorra: "vorrà", cioe: "cioè", percio: "perciò",
  finche: "finché", nonche: "nonché", citta: "città", qualita: "qualità", attivita: "attività",
  possibilita: "possibilità", realta: "realtà", societa: "società", verita: "verità",
  liberta: "libertà", responsabilita: "responsabilità", autorita: "autorità", priorita: "priorità",
  maturita: "maturità", complessita: "complessità", conformita: "conformità", proprieta: "proprietà",
  universita: "università", identita: "identità", unita: "unità", entita: "entità", novita: "novità",
  meta: "metà", virtu: "virtù", tribu: "tribù", caffe: "caffè", pero: "però" };
const accentoCorretto = (w) => _ACC[w.toLowerCase()] || w + "…";
// SOLO punteggiatura da PARLATO (regola utente 2026-07-04: è un copione, non un testo da
// leggere): niente parentesi di alcun tipo, virgolette, simboli, trattini lunghi, percentuali
const CHAR_OK = /^[\wàèéìòùÀÈÉÌÒÙ\s.,;:!?'-]+$/u;

// il glossario si applica PRIMA dei check sui caratteri: "ISO/IEC TS 17012" diventa
// la sua forma parlata, quindi lo slash della sigla non è un carattere anomalo
function conGlossario(t) {
  for (const k of Object.keys(glossario.map).sort((a, b) => b.length - a.length))
    t = t.split(k).join(glossario.map[k]);
  return t;
}

// Termini di sistema DEFINITI dalle norme: nomi tecnici lunghi e inevitabili (ogni corso
// deve poterli usare, non sono "copia" della norma ma il nome della cosa). Si collassano a
// un token PRIMA dell'n-gram, così E5/E8 controllano il CONTORNO, non il termine definito.
const TERMINI_SISTEMA = [
  "sistema di gestione per la qualità", "sistema di gestione ambientale",
  "sistema di gestione per la sicurezza delle informazioni",
  "sistema di gestione per la salute e sicurezza sul lavoro",
  "sistema di gestione per la sicurezza alimentare", "sistema di gestione dell'energia",
  "sistema di gestione per la prevenzione della corruzione",
  "sistema di gestione dell'intelligenza artificiale", "sistema di gestione di rts",
  "sistema di gestione", "sistemi di gestione", "parti interessate rilevanti",
].map((t) => t.replace(/[àèéìòù']/g, (c) => ({à:"a",è:"e",é:"e",ì:"i",ò:"o",ù:"u","'":" "}[c])));

// E5 — indice n-grammi della norma (forma canonica: minuscole, senza accenti/punteggiatura,
// termini di sistema collassati a "§")
const canon = (t) => {
  let s = t.toLowerCase()
    .replace(/[àá]/g, "a").replace(/[èé]/g, "e").replace(/[ìí]/g, "i")
    .replace(/[òó]/g, "o").replace(/[ùú]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");
  for (const term of TERMINI_SISTEMA) s = s.split(term).join(" § ");
  return s.split(/\s+/).filter(Boolean);
};
let normaShingles = null;
// match ESATTO ISO<corso> seguito da non-cifra: "9001" NON deve pescare ISO19011-2026.txt
const normaFile = existsSync("testonorme")
  ? readdirSync("testonorme").find((f) => f.endsWith(".txt") && new RegExp(`^ISO${corso}(\\D|$)`).test(f.replace(/\s+/g, "")))
  : null;
if (normaFile) {
  const parole = canon(readFileSync(`testonorme/${normaFile}`, "utf8"));
  normaShingles = new Set();
  for (let i = 0; i + NGRAM_VERBATIM <= parole.length; i++)
    normaShingles.add(parole.slice(i, i + NGRAM_VERBATIM).join(" "));
  console.log(`E5: confronto anti-verbatim con testonorme/${normaFile} (${parole.length} parole, ${normaShingles.size} sequenze)`);
} else {
  console.log(`E5: NESSUN testo norma trovato per "${corso}" in testonorme/ — check verbatim SALTATO`);
}

const paroleModulo = {}; // per E6

for (const s of copioni.slides) {
  if (modulo && !s.id.includes(`_${modulo}_`)) continue;
  const t = conGlossario(s.testo);
  const mod = (s.id.match(/_(m\d\d)_/) || [])[1];
  if (mod) paroleModulo[mod] = (paroleModulo[mod] || 0) + s.testo.split(/\s+/).filter(Boolean).length;

  // E5 — anti-verbatim (sul testo ORIGINALE, non glossariato: la norma non ha forme parlate)
  if (normaShingles) {
    const parole = canon(s.testo);
    for (let i = 0; i + NGRAM_VERBATIM <= parole.length; i++) {
      const sh = parole.slice(i, i + NGRAM_VERBATIM).join(" ");
      if (normaShingles.has(sh)) {
        err(s.id, "E5", `sequenza verbatim dalla norma: "${sh.slice(0, 70)}…"`);
        i += NGRAM_VERBATIM - 1; // non segnalare la stessa frase N volte
      }
    }
  }

  // E2 — parola ambigua a freddo
  const prime10 = t.split(/\s+/).slice(0, 10).join(" ");
  if (AMBIGUE.test(prime10))
    err(s.id, "E2", `"audit/auditor" nelle prime 10 parole: "${prime10.slice(0, 60)}…"`);

  // E3 — numeri: STANDARD AZURE marcello-v1 (2026-07-09, verdetto ascolto utente):
  // Marcello legge bene norme, anni e clausole in cifre. Restano vietati (fuori
  // glossario): numeri con TRATTINO (17021-1: il TTS legge il trattino — vanno in
  // glossario come "parte N"), conteggi brevi (in lettere), percentuali in cifre.
  const NUM_OK = /^(?:(?:19|20)\d\d|\d{4,5}|\d+(?:\.\d+)+)$/; // anno | norma | clausola 6.1.2
  for (const m of t.matchAll(/\d[\d.,-]*/g)) {
    const num = m[0].replace(/[.,]$/, "");
    if (NUM_OK.test(num)) continue;
    const coperto = Object.keys(glossario.map).some((k) => k.includes(num));
    if (!coperto) err(s.id, "E3", `numero "${num}" non ammesso in cifre (né in glossario): ${
      num.includes("-") ? "TRATTINO nel numero — serve la forma parlata (glossario, es. parte uno)" : "va scritto in lettere"}`);
  }

  // E4 — caratteri anomali
  if (!CHAR_OK.test(t)) {
    const strani = [...new Set([...t].filter((c) => !CHAR_OK.test(c)))].join(" ");
    err(s.id, "E4", `caratteri anomali: ${strani}`);
  }

  // E9 — accenti mancanti (la voce sintetica legge l'errore: parole SEMPRE accentate
  // la cui forma piana è sempre sbagliata in italiano). NON include "saranno" (piana
  // corretta: solo "sarà" singolare è accentata), né "efficacia"/"meta" (piane valide).
  for (const m of s.testo.matchAll(ACCENTI_MANCANTI))
    err(s.id, "E9", `accento mancante: "${m[0]}" (verso ${accentoCorretto(m[0])})`);

  // E10 — lessico vietato (revisione 45001, 2026-07-10): anglicismi al posto del
  // termine tecnico del corso. BLOCCANTE: il termine giusto esiste ed è definito nei moduli.
  const LESSICO_VIETATO = [
    [/\bnear[ -]miss(es)?\b/i, ["mancato infortunio", "quasi incidente", "quasi-incidente"]],
  ];
  for (const [rx, italiani] of LESSICO_VIETATO) {
    for (const fr of t.split(/(?<=[.!?])\s+/)) {
      const m = fr.match(rx);
      if (!m) continue;
      // menzione definitoria ammessa: la stessa frase contiene anche il termine italiano
      if (italiani.some((it) => fr.toLowerCase().includes(it))) continue;
      err(s.id, "E10", `lessico vietato "${m[0]}" — usare: ${italiani[0]}`);
    }
  }

  // W3 — concordanza articolo singolare + sostantivo plurale (visto "un quasi-incidenti"
  // nel 45001). Solo sostantivi del lessico corso, per evitare falsi positivi.
  const W3_PLURALI = /\b(?:un|uno|una|il|lo|la) (?:incidenti|rischi|controlli|obiettivi|requisiti|pericoli|processi|lavoratori|documenti|moduli|eventi|segnali|criteri|metodi|ruoli|turni|reparti|impianti|fornitori|appaltatori|indicatori|verifiche|azioni|cause|misure|indagini|emergenze|risultanze|procedure|quasi-incidenti|non conformità multiple)\b/gi;
  for (const m of s.testo.matchAll(W3_PLURALI))
    warn(s.id, "W3", `possibile concordanza rotta: "${m[0]}"`);

  // W4 — "disciplina" come verbo: trappola di prosodia TTS (FABBRICA-MODULO §2.7).
  for (const m of s.testo.matchAll(/\bdisciplina (?:l'|il |la |le |gli |i |lo |un |una )/gi))
    warn(s.id, "W4", `"disciplina" probabilmente usato come verbo (trappola prosodia): "${m[0]}…" — preferire stabilisce/definisce/richiede`);

  // W1/W2 — stile frasi
  for (const fr of t.split(/(?<=[.!?])\s+/)) {
    const parole = fr.split(/\s+/).length;
    if (parole > 35) warn(s.id, "W1", `frase da ${parole} parole: "${fr.slice(0, 50)}…"`);
    else if (parole > 15 && !fr.includes(","))
      warn(s.id, "W2", `frase da ${parole} parole senza virgole: "${fr.slice(0, 50)}…"`);
  }
}

// E6 — budget parole per modulo, ASIMMETRICO [-5%, +2%] (meglio corti che lunghi)
const minutiPerModulo = copioni.budget?.minutiPerModulo || null;
if (minutiPerModulo) {
  for (const [mod, parole] of Object.entries(paroleModulo)) {
    const minuti = minutiPerModulo[mod];
    if (!minuti) { err(mod, "E6", `modulo senza budget minuti in budget.minutiPerModulo`); continue; }
    const target = minuti * 60 * PAROLE_AL_SECONDO;
    const scarto = (parole - target) / target;
    if (scarto < -0.05 || scarto > 0.02)
      err(mod, "E6", `${parole} parole vs target ${Math.round(target)} (${minuti} min): scarto ${(scarto * 100).toFixed(1)}% (limiti -5% / +2%)`);
    else
      console.log(`  E6 ok [${mod}] ${parole} parole ≈ ${(parole / PAROLE_AL_SECONDO / 60).toFixed(1)} min (target ${minuti}, ${(scarto * 100).toFixed(1)}%)`);
  }
  // guardia di CORSO (solo lint completo): somma stimata >= minuti legali +1%
  const legali = copioni.budget?.minutiLegali;
  if (legali && !modulo) {
    // la guardia ha senso solo quando il budget dichiarato copre l'intero corso
    // e tutti i moduli dichiarati sono stati scritti
    const budgetTot = Object.values(minutiPerModulo).reduce((a, b) => a + b, 0);
    const tuttiIModuli = budgetTot >= legali
      && Object.keys(minutiPerModulo).every((m) => m in paroleModulo);
    if (tuttiIModuli) {
      // margine +0,5% sopra il minimo LEGALE: cuscinetto reale (la stima è calibrata a 2,35
      // p/s misurati sul pilota, quindi ≈ audio reale) senza forzare corsi lunghi (pref. utente
      // "meglio corti"). L'autorità FINALE resta la durata audio misurata in build-course.
      const minutiStimati = Object.values(paroleModulo).reduce((a, b) => a + b, 0) / PAROLE_AL_SECONDO / 60;
      const soglia = legali * 1.005;
      if (minutiStimati < soglia)
        err("corso", "E6", `monte-ore stimato ${minutiStimati.toFixed(0)} min < soglia ${soglia.toFixed(0)} (legali ${legali} +0,5%) — allungare il modulo più corto`);
      else
        console.log(`  E6 corso ok: ${minutiStimati.toFixed(0)} min stimati ≥ ${soglia.toFixed(0)} (legali ${legali}, margine +${(minutiStimati/legali*100-100).toFixed(1)}%)`);
    } else {
      console.log("  E6 corso: moduli mancanti all'appello — guardia monte-ore rinviata");
    }
  }
} else {
  console.log("E6: budget.minutiPerModulo assente dai copioni — check budget SALTATO");
}

// E8 — anti-fotocopia cross-corso (n-grammi >=10 parole vs copioni degli ALTRI corsi)
const NGRAM_XCORSO = 10;
const altriCorsi = existsSync("produzione")
  ? readdirSync("produzione").filter((d) => /^\d+$/.test(d) && d !== corso
      && existsSync(`produzione/${d}/copioni.json`))
  : [];
if (altriCorsi.length) {
  const mieShingles = new Map(); // shingle -> id slide (per il messaggio d'errore)
  for (const s of copioni.slides) {
    if (modulo && !s.id.includes(`_${modulo}_`)) continue;
    const parole = canon(s.testo);
    for (let i = 0; i + NGRAM_XCORSO <= parole.length; i++)
      mieShingles.set(parole.slice(i, i + NGRAM_XCORSO).join(" "), s.id);
  }
  let e8 = 0;
  for (const altro of altriCorsi) {
    const ac = JSON.parse(readFileSync(`produzione/${altro}/copioni.json`, "utf8"));
    for (const s of ac.slides || []) {
      const parole = canon(s.testo);
      for (let i = 0; i + NGRAM_XCORSO <= parole.length; i++) {
        const sh = parole.slice(i, i + NGRAM_XCORSO).join(" ");
        if (mieShingles.has(sh)) {
          err(mieShingles.get(sh), "E8", `fotocopia da ${altro}/${s.id}: "${sh.slice(0, 60)}…"`);
          e8++; i += NGRAM_XCORSO - 1;
          if (e8 > 20) break;
        }
      }
      if (e8 > 20) break;
    }
    if (e8 > 20) { console.log("  E8: oltre 20 fotocopie — output troncato"); break; }
  }
  if (!e8) console.log(`E8 ok: nessuna fotocopia dagli altri ${altriCorsi.length} corsi`);
} else {
  console.log("E8: nessun altro corso con copioni — check fotocopia SALTATO");
}

// Q* — quiz-lint (QUIZ-STANDARD.md)
const checkpoint = copioni.checkpoint || {};
for (const [mod, blocco] of Object.entries(checkpoint)) {
  if (modulo && mod !== modulo) continue;
  if (!(mod in paroleModulo)) continue; // banca di un modulo non ancora scritto: la si lint-a col modulo
  const banca = blocco?.banca;
  if (!Array.isArray(banca) || banca.length < 10) {
    err(mod, "Q1", `banca checkpoint assente o < 10 domande (${banca?.length ?? 0})`);
    continue;
  }
  const slideIdsMod = new Set(copioni.slides.filter((s) => s.id.includes(`_${mod}_`))
    .map((s) => s.id.split("_").pop()));
  const tipi = { riconoscimento: 0, comprensione: 0, applicazione: 0 };
  const posizioni = new Set();
  banca.forEach((q, i) => {
    if (!Array.isArray(q.opzioni) || q.opzioni.length !== 4)
      err(mod, "Q2", `domanda ${i}: servono esattamente 4 opzioni`);
    if (!(Number.isInteger(q.corretta) && q.corretta >= 0 && q.corretta <= 3))
      err(mod, "Q2", `domanda ${i}: indice risposta corretta non valido`);
    else posizioni.add(q.corretta);
    if (!q.tipo || !(q.tipo in tipi)) err(mod, "Q3", `domanda ${i}: tipo mancante o non valido`);
    else tipi[q.tipo]++;
    if (!q.slide || !slideIdsMod.has(q.slide))
      err(mod, "Q4", `domanda ${i}: slide di tracciabilità "${q.slide ?? "-"}" inesistente nel modulo`);
    if ((q.opzioni || []).some((o) => /tutte le precedenti|nessuna delle precedenti/i.test(o)))
      err(mod, "Q2", `domanda ${i}: vietato "tutte/nessuna delle precedenti"`);
  });
  const n = banca.length;
  if (tipi.riconoscimento < Math.floor(n * 0.4) - 1 || tipi.comprensione < Math.floor(n * 0.4) - 1
      || tipi.applicazione < Math.max(1, Math.floor(n * 0.2) - 1))
    err(mod, "Q3", `mix tipi sbilanciato: ${JSON.stringify(tipi)} su ${n} (atteso ~40/40/20)`);
  if (posizioni.size < 3)
    err(mod, "Q5", `risposta corretta sempre nelle stesse posizioni (${[...posizioni].join(",")}): variare`);
  if (!Object.values(checkpoint).length) continue;
}
for (const mod of Object.keys(paroleModulo)) {
  if (!(mod in checkpoint)) err(mod, "Q1", "modulo senza banca checkpoint");
}

// E7 — copertura concetti chiave (produzione/<corso>/copertura.json: { "mNN": ["concetto", ...] })
// (ROOT-aware: la staging root dell'orchestratore porta la sua copia di copertura.json)
const coperturaPath = `${ROOT}/${corso}/copertura.json`;
if (existsSync(coperturaPath)) {
  const copertura = JSON.parse(readFileSync(coperturaPath, "utf8"));
  // guardia anti-stem-tronchi (lezione "risultanz" 45001): uno stem non-parola il modello
  // tende a scriverlo LETTERALMENTE nel testo → parola spezzata in TTS. Le parole italiane
  // finiscono in vocale: un termine mono-parola che finisce in consonante e non è una
  // sigla maiuscola né un forestierismo noto è quasi certamente uno stem tronco.
  const STEM_OK = /(?:[aeiouàèéìòù]|[A-Z]{2,}|cloud|log|backup|malware|standard|audit|auditor|team|leader|leadership|checklist|manager|software|hardware|password|phishing|business|report)$/;
  for (const [mod, concetti] of Object.entries(copertura))
    for (const c of concetti)
      if (!c.includes(" ") && !STEM_OK.test(c))
        warn(mod, "W5", `copertura: "${c}" sembra uno stem tronco — usare la parola intera (il modello può scriverlo letteralmente nel testo)`);
  for (const [mod, concetti] of Object.entries(copertura)) {
    if (modulo && mod !== modulo) continue;
    if (!(mod in paroleModulo)) continue; // modulo non ancora scritto: si verifica al suo merge
    const testoMod = canon(copioni.slides
      .filter((s) => s.id.includes(`_${mod}_`)).map((s) => s.testo).join(" ")).join(" ");
    for (const c of concetti)
      if (!testoMod.includes(canon(c).join(" ")))
        err(mod, "E7", `concetto chiave assente: "${c}"`);
  }
} else {
  console.log(`E7: ${coperturaPath} assente — check copertura SALTATO`);
}

const n = copioni.slides.filter((s) => !modulo || s.id.includes(`_${modulo}_`)).length;
console.log(`\n${n} slide esaminate · ${errori} ERRORI · ${avvisi} avvisi`);
if (errori) {
  console.log("LINT FALLITO — correggere gli errori prima di generare.");
  process.exit(1);
}
console.log("LINT OK — copioni pronti per la generazione.");
