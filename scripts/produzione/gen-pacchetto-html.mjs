// Variante di gen-pacchetto per i corsi a FONTE HTML (Claude AI base/avanzato).
// Differenza dagli ISO: la fonte NON è la norma-PDF ma il contenuto del modulo del cliente,
// già estratto slide-per-slide in produzione/<corso>/_fonte/<mNN>.txt. Il copione ESPANDE
// quella fonte fino al budget (monte-ore), aggiungendo esempi/applicazioni professionali,
// mai copiando verbatim (gate E5) e mai nominando "il modulo/il documento/la fonte" (gate E11).
//
// Uso: node scripts/produzione/gen-pacchetto-html.mjs <corso> <mNN>
// Output: produzione/<corso>/_pacchetti/<mNN>.md

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const corso = process.argv[2];
const mod = process.argv[3];
if (!corso || !/^m\d\d$/.test(mod ?? "")) {
  console.error("Uso: gen-pacchetto-html.mjs <corso> <mNN>"); process.exit(2);
}

const md = readFileSync(`produzione/${corso}/struttura.md`, "utf8");
const nMod = parseInt(mod.slice(1), 10);
// titolo del CORSO dall'header dello skeleton (niente hardcode "Auditor ISO")
const titoloCorso = (md.match(/^#\s+(.+)$/m)?.[1] ?? corso).trim();
// riga del modulo
const riga = md.match(new RegExp(`\\|\\s*M${nMod}\\s*\\|([^|]+)\\|([^|]+)\\|\\s*(\\d+)\\s*min\\s*\\|\\s*(\\d+)\\s*\\|`));
if (!riga) { console.error(`M${nMod} non trovato nello skeleton`); process.exit(1); }
const [, titolo, copre, minuti, nSlide] = riga.map((x) => (x ?? "").toString().trim());
const rigaNext = md.match(new RegExp(`\\|\\s*M${nMod + 1}\\s*\\|([^|]+)\\|`));
const titoloNext = rigaNext ? rigaNext[1].trim().replace(/\*/g, "")
  : "NESSUNO: è l'ultimo modulo — l'ultima slide chiude il CORSO e prepara all'esame/al laboratorio finale";

// ---- FONTE: contenuto HTML del cliente, già estratto slide-per-slide
const fontePath = `produzione/${corso}/_fonte/${mod}.txt`;
if (!existsSync(fontePath)) { console.error(`fonte mancante: ${fontePath}`); process.exit(1); }
const fonte = readFileSync(fontePath, "utf8").trim();

// ---- glossario del corso (termini IA: API, MCP, LLM, ISO/IEC 42001, ...)
const glossPath = `produzione/${corso}/glossario-tts.json`;
const glossario = existsSync(glossPath) ? readFileSync(glossPath, "utf8") : '{ "map": {} }';

// ---- contratto di stile (registro/ritmo/transizioni): 2 slide di riferimento 19011 M2
const rif = JSON.parse(readFileSync("produzione/19011/copioni.json", "utf8"));
const esempi = rif.slides.filter((s) => ["19011_m02_s005", "19011_m02_s017"].includes(s.id));

const regole = readFileSync("docs/produzione-corsi/FABBRICA-MODULO.md", "utf8");
const quizStd = readFileSync("docs/produzione-corsi/QUIZ-STANDARD.md", "utf8");

const budgetParole = Math.round(parseInt(minuti, 10) * 60 * 2.35);
const out = `# PACCHETTO MODULO (fonte HTML) — corso ${corso} · ${mod.toUpperCase()}

## Il tuo incarico
- Corso: **${titoloCorso}** · Modulo ${nMod}: **${titolo.replace(/\*/g, "")}**
- Copertura dichiarata: ${copre}
- Budget: **${minuti} minuti · ${nSlide} slide · ~${budgetParole} parole totali** (limiti: da ${Math.round(budgetParole * 0.95)} a ${Math.round(budgetParole * 1.02)} parole — in dubbio, PIÙ CORTO)
- ID slide: \`${corso}_${mod}_s001\` … \`${corso}_${mod}_s${String(nSlide).padStart(3, "0")}\`
- Modulo successivo (per l'aggancio finale): ${titoloNext}
- Output: SOLO \`produzione/${corso}/_bozze/${mod}.json\` (formato in fondo). NON toccare altri file.

## Come usare la FONTE (leggi bene)
La fonte qui sotto è il contenuto didattico ORIGINALE del cliente, già organizzato in slide brevi.
È il tuo **backbone**: rispettane l'ordine e i concetti. MA è **breve** (pensata per la lettura):
il tuo compito è **ESPANDERLA fino al budget** trasformandola in narrazione parlata ricca.
**Come espandere BENE (regola dell'utente):** non solo esempi d'uso — aggiungi anche **nozioni
importanti, spiegazioni di fondo e informazioni utili** che siano **coerenti col punto di
partenza** (approfondisci il concetto, il perché, i come, i rischi, le buone pratiche), oltre a
esempi e applicazioni per profili professionali reali (consulenza, amministrazione, formazione).
Espansione ≠ riempitivo: ogni frase deve dire qualcosa di nuovo e vero (il giudice severo
scarta il padding e la ripetizione).
- **Mai copiare verbatim** la fonte (gate E5): riscrivi in stile parlato.
- **Mai nominare la fonte** nel copione: niente "il modulo", "il documento", "la slide", "il materiale" (gate E11). Parla direttamente allo studente.

## Glossario del corso (usa ESATTAMENTE queste chiavi; ogni altro numero va in lettere)
${glossario}

${regole}

${quizStd}

## Contratto di stile — DUE SLIDE COMPLETE di riferimento (imita registro, ritmo, transizioni)
${esempi.map((s) => `### Esempio: ${s.titolo}\n${s.testo}`).join("\n\n")}

## Formato di output (JSON, UTF-8)
\`\`\`json
{
  "modulo": "${mod}",
  "slides": [ { "id": "${corso}_${mod}_s001", "titolo": "…", "budgetParole": ${Math.round(budgetParole / parseInt(nSlide, 10))}, "testo": "…" } ],
  "checkpoint": { "modulo": "${mod}", "estrazione": 5, "soglia": 0.8,
    "banca": [ { "q": "…", "opzioni": ["…","…","…","…"], "corretta": 0, "tipo": "riconoscimento|comprensione|applicazione", "slide": "s001" } ] }
}
\`\`\`

## LA FONTE (contenuto del cliente, slide-per-slide — tua UNICA base; espandila, non copiarla)
${fonte}
`;

mkdirSync(`produzione/${corso}/_pacchetti`, { recursive: true });
const outPath = `produzione/${corso}/_pacchetti/${mod}.md`;
writeFileSync(outPath, out, "utf8");
console.log(`${outPath}: ${out.length} caratteri · fonte ${fonte.length} char · budget ${minuti}min/${nSlide}slide/${budgetParole}parole`);
