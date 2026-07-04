// Genera il PACCHETTO di lavoro di UN modulo per l'agente di drafting (fabbrica copioni).
// Contenuto: sezione ESATTA della norma (solo i capitoli coperti dal modulo) + blocco
// skeleton + contratto di stile (2 slide complete di 19011 M2) + glossario + regole.
// L'agente riceve SOLO questo file: mai la norma intera, mai altri corsi.
//
// Uso: node scripts/produzione/gen-pacchetto.mjs <corso> <mNN>
// Output: produzione/<corso>/_pacchetti/<mNN>.md

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const corso = process.argv[2];
const mod = process.argv[3]; // es. m03
if (!corso || !/^m\d\d$/.test(mod ?? "")) {
  console.error("Uso: gen-pacchetto.mjs <corso> <mNN>"); process.exit(2);
}

// ---- skeleton: riga tabella + blocco argomenti del modulo
const md = readFileSync(`produzione/${corso}/struttura.md`, "utf8");
const nMod = parseInt(mod.slice(1), 10);
const riga = md.match(new RegExp(`\\|\\s*M${nMod}\\s*\\|([^|]+)\\|([^|]+)\\|\\s*(\\d+)\\s*min\\s*\\|\\s*(\\d+)\\s*\\|`));
if (!riga) { console.error(`M${nMod} non trovato nello skeleton`); process.exit(1); }
const [, titolo, copre, minuti, nSlide] = riga.map((x) => (x ?? "").toString().trim());
// titolo del modulo SUCCESSIVO (per l'aggancio dell'ultima slide — lacuna emersa nel rodaggio M4)
const rigaNext = md.match(new RegExp(`\\|\\s*M${nMod + 1}\\s*\\|([^|]+)\\|`));
const titoloNext = rigaNext ? rigaNext[1].trim().replace(/\*/g, "")
  : "NESSUNO: è l'ultimo modulo — l'ultima slide chiude il CORSO e prepara all'esame finale";
const blocco = md.split(/### /).slice(1).find((s) => s.match(/^M(\d+)/)?.[1] === String(nMod));
if (!blocco) { console.error(`Blocco argomenti M${nMod} non trovato`); process.exit(1); }
const argomenti = blocco.split("\n").slice(1).join("\n").split("## ")[0].trim();

// ---- norma: capitoli coperti (dal campo "Copre"); i moduli metodologici (senza §)
// ricevono l'indice + il capitolo 9 (audit interno) come ancoraggio
const normaFile = readdirSync("testonorme").find((f) => f.endsWith(".txt")
  && new RegExp(`^ISO${corso}(\\D|$)`).test(f.replace(/\s+/g, "")));
if (!normaFile) { console.error("testo norma non trovato"); process.exit(1); }
let txt;
try { txt = readFileSync(`testonorme/${normaFile}`, "utf8"); }
catch { txt = readFileSync(`testonorme/${normaFile}`, "latin1"); }
if (txt.includes("�")) txt = readFileSync(`testonorme/${normaFile}`, "latin1");

// offset dei capitoli 1-10 nel CORPO (ultima occorrenza dell'header = corpo, non indice)
const cap = {};
for (const m of txt.matchAll(/^\s{0,8}([1-9]|10)\s+[A-ZÀ-ÚÈÉ][A-ZÀ-ÚÈÉ '’-]{3,60}$/gm))
  cap[parseInt(m[1], 10)] = m.index; // sovrascrive: resta l'ultima (il corpo)
const appendice = txt.search(/^\s{0,8}APPENDICE\s+A/m);
const fine = (n) => {
  for (let k = n + 1; k <= 11; k++) if (k === 11) return appendice > 0 ? appendice : txt.length;
    else if (cap[k] !== undefined && cap[k] > (cap[n] ?? 0)) return cap[k];
  return txt.length;
};

const capitoliCoperti = [...new Set([...copre.matchAll(/§?\s*(\d+)(?:\.\d+)?/g)]
  .map((m) => parseInt(m[1], 10)).filter((n) => n >= 1 && n <= 10))];
let sezione;
if (capitoliCoperti.length) {
  const lo = Math.min(...capitoliCoperti), hi = Math.max(...capitoliCoperti);
  sezione = txt.slice(cap[lo] ?? 0, fine(hi));
  if (/appendice|allegato/i.test(copre) && appendice > 0) sezione += "\n\n" + txt.slice(appendice);
} else if (/appendice/i.test(copre) && appendice > 0) {
  sezione = txt.slice(appendice);
} else {
  // modulo introduttivo o metodologico: introduzione + scopo/termini (fino al cap. 4)
  sezione = txt.slice(0, cap[4] ?? 20000);
}
sezione = sezione.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n");
// filigrana licenza/pagine via (rumore per l'agente)
sezione = sezione.replace(/^.*UNIstore.*$/gm, "").replace(/^.*ROMEO RAIMONDO.*$/gm, "")
  .replace(/^\s*UNI CEI EN ISO.*Pagina \d+\s*$/gm, "");

// ---- contratto di stile: 2 slide complete del 19011 M2 (riferimento qualità)
const rif = JSON.parse(readFileSync("produzione/19011/copioni.json", "utf8"));
const esempi = rif.slides.filter((s) => ["19011_m02_s005", "19011_m02_s017"].includes(s.id));
const esempioQuiz = rif.checkpoint?.m02?.banca?.slice(0, 3) ?? [];

// ---- glossario del corso
const glossPath = `produzione/${corso}/glossario-tts.json`;
const glossario = existsSync(glossPath) ? readFileSync(glossPath, "utf8") : '{ "map": {} }';

// ---- copertura del modulo (gate E7)
const copPath = `produzione/${corso}/copertura.json`;
const copertura = existsSync(copPath)
  ? JSON.stringify(JSON.parse(readFileSync(copPath, "utf8"))[mod] ?? [], null, 1)
  : "[]";

const regole = readFileSync("docs/produzione-corsi/FABBRICA-MODULO.md", "utf8");
const quizStd = readFileSync("docs/produzione-corsi/QUIZ-STANDARD.md", "utf8");

const budgetParole = Math.round(parseInt(minuti, 10) * 60 * 2.35);
const out = `# PACCHETTO MODULO — corso ${corso} · ${mod.toUpperCase()}

## Il tuo incarico
- Corso: Auditor — ISO ${corso} · Modulo ${nMod}: **${titolo.replace(/\*/g, "")}**
- Copertura norma dichiarata: ${copre}
- Budget: **${minuti} minuti · ${nSlide} slide · ~${budgetParole} parole totali** (limiti modulo: da ${Math.round(budgetParole * 0.95)} a ${Math.round(budgetParole * 1.02)} parole — in dubbio, PIÙ CORTO)
- ID slide: \`${corso}_${mod}_s001\` … \`${corso}_${mod}_s${String(nSlide).padStart(3, "0")}\`
- Modulo successivo (per l'aggancio finale): ${titoloNext}
- Output: SOLO il file \`produzione/${corso}/_bozze/${mod}.json\` (formato in fondo). NON toccare nessun altro file.

## Struttura del modulo (dallo skeleton — OGNI blocco va sviluppato, coi conteggi slide indicati)
${argomenti}

## Concetti che DEVONO comparire (gate automatico E7)
${copertura}

## Glossario del corso (usa ESATTAMENTE queste chiavi; ogni altro numero va scritto in lettere)
${glossario}

${regole}

${quizStd}

## Contratto di stile — DUE SLIDE COMPLETE di riferimento (imita registro, ritmo, transizioni)
${esempi.map((s) => `### Esempio: ${s.titolo}\n${s.testo}`).join("\n\n")}

### Esempio di domande checkpoint ben fatte
${JSON.stringify(esempioQuiz, null, 1)}

## Formato di output (JSON, UTF-8)
\`\`\`json
{
  "modulo": "${mod}",
  "slides": [ { "id": "${corso}_${mod}_s001", "titolo": "…", "budgetParole": ${Math.round(budgetParole / parseInt(nSlide, 10))}, "testo": "…" } ],
  "checkpoint": { "modulo": "${mod}", "estrazione": 5, "soglia": 0.8,
    "banca": [ { "q": "…", "opzioni": ["…","…","…","…"], "corretta": 0, "tipo": "riconoscimento|comprensione|applicazione", "slide": "s001" } ] }
}
\`\`\`

## LA SEZIONE DELLA NORMA (la tua UNICA fonte tecnica — mai copiarla verbatim: gate E5)
${sezione}
`;

mkdirSync(`produzione/${corso}/_pacchetti`, { recursive: true });
const outPath = `produzione/${corso}/_pacchetti/${mod}.md`;
writeFileSync(outPath, out, "utf8");
console.log(`${outPath}: ${out.length} caratteri · sezione norma ${sezione.length} char · capitoli [${capitoliCoperti.join(",") || "intro"}]`);
