// QA CONTESTUALITÀ — giudice LLM: ogni slide vs la NARRAZIONE che dirà l'avatar.
// Verifica due cose che il gate strutturale (gate-slides) non può vedere:
//   PRECISIONE   — il testo a schermo è fedele/corretto rispetto alla narrazione,
//                  senza errori, invenzioni o contraddizioni (niente allucinazioni);
//   CONTESTUALITÀ— la slide rappresenta i concetti CHIAVE della narrazione, on-topic,
//                  senza roba fuori tema o irrilevante, e coerente col titolo.
// Usa Azure OpenAI (stesse env del progetto). COSTA un po' di API (gpt-4.1-mini) ed è
// più lento del gate: è un passo OPT-IN, da lanciare quando vuoi la revisione semantica.
//
// Uso: node --env-file=.env scripts/produzione/qa-contestualita.mjs <corso> --dir slide-in/<corso> [--modulo mNN]
// Output: produzione/_staging/slide-gates/<corso>/contestualita.json + contestualita.html

import fs from "node:fs";
import path from "node:path";
import { dirs, readJson } from "./lib.mjs";

const corso = process.argv[2];
const dirIx = process.argv.indexOf("--dir");
const slidesDir = dirIx !== -1 ? process.argv[dirIx + 1] : null;
const modIx = process.argv.indexOf("--modulo");
const modulo = modIx !== -1 ? process.argv[modIx + 1] : null;
if (!corso || !slidesDir) {
  console.error("Uso: node --env-file=.env scripts/produzione/qa-contestualita.mjs <corso> --dir <dir> [--modulo mNN]");
  process.exit(2);
}

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deploy = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT;
if (!endpoint || !apiKey || !deploy) {
  console.error("Azure non configurato. Lancia con:  node --env-file=.env scripts/produzione/qa-contestualita.mjs ...");
  process.exit(2);
}

const copioni = readJson(dirs(corso).copioni);
const narr = new Map(copioni.slides.map((s) => [s.id, { titolo: s.titolo || "", testo: s.testo || "" }]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function testoSlide(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SYS =
  "Sei un revisore didattico rigoroso per corsi di certificazione auditor ISO. " +
  "Ricevi la NARRAZIONE (ciò che il relatore dice a voce) e il TESTO A SCHERMO di una slide. " +
  "La slide deve RIASSUMERE VISIVAMENTE i concetti chiave della narrazione: non deve ripeterla " +
  "parola per parola, ma non deve nemmeno contenere errori, contraddizioni o concetti assenti/estranei. " +
  "Valuta due assi da 1 a 5:\n" +
  "PRECISIONE: il contenuto a schermo è corretto e fedele alla narrazione (5=nessun errore né invenzione; " +
  "1=errori o affermazioni non supportate dalla narrazione).\n" +
  "  REGOLA DURA — questi sono ERRORI FATTUALI e impongono precisione 1-2 (mai 3+):\n" +
  "   • una voce di elenco INVENTATA o non presente nel copione;\n" +
  "   • un CONTEGGIO sbagliato (es. dice 'sette fonti' ma una voce è inventata o ne manca una);\n" +
  "   • voci di elenco SCAMBIATE, fuse o attribuite al numero sbagliato;\n" +
  "   • numeri di norma, anni, edizioni, numeri di clausola ERRATI;\n" +
  "   • definizioni alterate o termini tecnici sbagliati.\n" +
  "  Le semplici OMISSIONI (la slide riassume e tralascia dettagli presenti solo nella voce) NON sono " +
  "errori: in quel caso la precisione resta 4-5. Distingui con cura errore-fattuale vs omissione.\n" +
  "CONTESTUALITÀ: la slide copre i concetti CHIAVE della narrazione ed è on-topic e coerente col titolo " +
  "(5=centra i punti giusti; 1=fuori tema, superficiale o incoerente).\n" +
  "Rispondi SOLO con JSON: " +
  '{"precisione":n,"contestualita":n,"problemi":["..."],"verdetto":"PASS|WARN|FAIL"}. ' +
  "verdetto=FAIL se precisione<=2 o contestualita<=2; WARN se una delle due =3; altrimenti PASS. " +
  "problemi: massimo 3 voci brevi e concrete (vuoto se PASS).";

async function judge(narrazione, titolo, schermo) {
  const user =
    `TITOLO SLIDE: ${titolo}\n\nNARRAZIONE (voce del relatore):\n${narrazione}\n\n` +
    `TESTO A SCHERMO della slide:\n${schermo || "(vuoto)"}\n\nValuta e rispondi SOLO JSON.`;
  const body = {
    model: deploy,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYS }, { role: "user", content: user }],
  };
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(`${endpoint.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", connection: "close" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        if (/Unknown model|rate limit|429|50[234]/i.test(t) && i < 5) { await sleep(400 * 2 ** i + Math.random() * 300); continue; }
        throw new Error(`${r.status} ${t.slice(0, 120)}`);
      }
      const j = await r.json();
      return JSON.parse(j.choices[0].message.content);
    } catch (e) {
      if (i === 5) throw e;
      await sleep(400 * 2 ** i + Math.random() * 300);
    }
  }
}

// --- file da valutare (filtro modulo opzionale) ---
let files = fs.readdirSync(slidesDir).filter((f) => f.endsWith(".html"));
if (modulo) files = files.filter((f) => f.includes(`_${modulo}_`));
files.sort();
if (!files.length) { console.error(`Nessun .html da valutare in ${slidesDir}${modulo ? ` (modulo ${modulo})` : ""}`); process.exit(1); }

const outDir = path.join(process.env.PRODUZIONE_ROOT || "produzione", "_staging", "slide-gates", corso);
fs.mkdirSync(outDir, { recursive: true });

console.log(`Giudizio semantico di ${files.length} slide (Azure ${deploy})…`);
const CONC = 5;
const results = {};
let idx = 0;
async function worker() {
  while (idx < files.length) {
    const f = files[idx++];
    const id = f.replace(/\.html$/, "");
    const meta = narr.get(id);
    if (!meta) { results[id] = { verdetto: "SKIP", problemi: ["ID non nei copioni"] }; process.stdout.write("s"); continue; }
    const schermo = testoSlide(fs.readFileSync(path.join(slidesDir, f), "utf8"));
    try {
      const v = await judge(meta.testo, meta.titolo, schermo);
      results[id] = v;
      process.stdout.write(v.verdetto === "FAIL" ? "F" : v.verdetto === "WARN" ? "w" : ".");
    } catch (e) {
      results[id] = { verdetto: "ERRORE", problemi: [String(e).slice(0, 120)] };
      process.stdout.write("E");
    }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
console.log("");

// --- report ---
const ordered = files.map((f) => f.replace(/\.html$/, "")).map((id) => ({ id, ...results[id] }));
const nFail = ordered.filter((r) => r.verdetto === "FAIL").length;
const nWarn = ordered.filter((r) => r.verdetto === "WARN").length;
const nErr = ordered.filter((r) => r.verdetto === "ERRORE").length;
fs.writeFileSync(path.join(outDir, "contestualita.json"), JSON.stringify({ corso, modulo, generato: new Date().toISOString(), slide: results }, null, 1));

const rows = ordered.map((r) => {
  const cls = r.verdetto === "FAIL" ? "FAIL" : r.verdetto === "WARN" ? "WARN" : r.verdetto === "PASS" ? "PASS" : "SKIP";
  const p = (r.problemi || []).join(" · ");
  return `<tr class="${cls}"><td>${r.id}</td><td>${r.precisione ?? "–"}</td><td>${r.contestualita ?? "–"}</td><td>${r.verdetto}</td><td>${p}</td></tr>`;
}).join("");
fs.writeFileSync(path.join(outDir, "contestualita.html"), `<!doctype html><meta charset="utf-8">
<title>Contestualità ${corso}${modulo ? " " + modulo : ""}</title>
<style>body{font-family:system-ui;background:#111;color:#eee;margin:16px}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:6px 10px;font-size:13px;text-align:left}
tr.FAIL{background:#3a1414}tr.WARN{background:#3a3014}tr.PASS td:nth-child(4){color:#7CFC7C}
th{background:#222}</style>
<h1>${corso}${modulo ? " · " + modulo : ""} — precisione & contestualità (${ordered.length} slide)</h1>
<p>PASS ${ordered.length - nFail - nWarn - nErr} · WARN ${nWarn} · FAIL ${nFail} · ERRORE ${nErr}</p>
<table><tr><th>ID</th><th>Prec.</th><th>Contest.</th><th>Verdetto</th><th>Problemi</th></tr>${rows}</table>`);

console.log(`\n${ordered.length} slide · PASS ${ordered.length - nFail - nWarn - nErr} · WARN ${nWarn} · FAIL ${nFail} · ERRORE ${nErr}`);
console.log(`report: ${path.join(outDir, "contestualita.json")}\nhtml:    ${path.join(outDir, "contestualita.html")}`);
process.exitCode = nFail ? 1 : 0; // niente process.exit: lascia chiudere i socket (evita l'assert libuv su Windows)
