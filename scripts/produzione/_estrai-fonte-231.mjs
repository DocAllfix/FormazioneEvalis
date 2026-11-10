// Estrae il contenuto didattico dei corsi 231 (FAD-231-01/02/03/04: un HTML ciascuno, stesso motore —
// oggetto COURSE con modules[].slides{t,h}, checkpoints{after,q,o,a,why}, quiz{q,o,a} e final{q,o,a})
// nel formato della fabbrica: _fonte/<mNN>.txt (un modulo del committente = un nostro modulo; una sezione
// per slide del committente, una schermata per blocco titolato della slide; gli step di controllo
// restano dove li mette il committente, con la spiegazione) + _fonte/quiz.json (step e test di fine
// modulo = base dei checkpoint, esame finale = base dell'esame).
// Lo script del corso si ESEGUE in un contesto isolato (vm, DOM finto e muto) per leggere COURSE e la
// presentazione del corso esattamente come li vede il discente.
// La NOTA DI PRODUZIONE e i riferimenti di legge in coda a ogni modulo vengono da
// produzione/<corso>/_fonte-note.json (scritto a mano): { "tutti": "...", "m01": "...", "legge": { "m01": "..." } }.
// Uso: node scripts/produzione/_estrai-fonte-231.mjs <file.html> <corso>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import vm from "node:vm";

const [file, corso] = process.argv.slice(2);
if (!file || !corso) { console.error("Uso: _estrai-fonte-231.mjs <file.html> <corso>"); process.exit(2); }
const out = `produzione/${corso}/_fonte`;
mkdirSync(out, { recursive: true });

const html = readFileSync(file, "utf8");
const codice = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
const muto = new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => "" : muto),
  apply: () => muto, construct: () => muto, set: () => true,
});
const ctx = {
  console, document: muto, window: muto, navigator: muto, location: muto, history: muto,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener() {}, setTimeout() {}, setInterval() {}, clearInterval() {}, requestAnimationFrame() {},
  confirm: () => false, alert() {},
};
vm.createContext(ctx);
vm.runInContext(`${codice}\n;globalThis.__C = COURSE; globalThis.__A = app;`, ctx, { timeout: 10000 });
const C = ctx.__C, app = ctx.__A;
app.load();

const testo = (h) => String(h ?? "")
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
  .replace(/<(input|button)[^>]*>([\s\S]*?<\/button>)?/g, " ")
  .replace(/<\/(p|div|li|h[1-6]|tr|section|label)>/g, "\n")
  .replace(/<\/t[dh]>/g, " | ")
  .replace(/<br\s*\/?>/g, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, " ")
  .split("\n").map((r) => r.trim().replace(/\s*\|\s*$/, "")).filter(Boolean).join("\n");

// una slide del committente → blocchi titolati (h3/h4): sono gli argomenti slide per slide della struttura
function blocchi(s) {
  const pezzi = s.h.split(/(?=<h[34][^>]*>)/);
  const res = [];
  for (const p of pezzi) {
    const m = p.match(/^<h[34][^>]*>([\s\S]*?)<\/h[34]>/);
    const titolo = m ? testo(m[1]).replace(/\n/g, " ") : s.t;
    const corpo = testo(m ? p.slice(m[0].length) : p);
    if (!corpo && !m) continue;
    if (res.length && !corpo) { res[res.length - 1].corpo += `\n${titolo}`; continue; }
    res.push({ titolo, corpo });
  }
  return res.length ? res : [{ titolo: s.t, corpo: testo(s.h) }];
}

const note = existsSync(`produzione/${corso}/_fonte-note.json`)
  ? JSON.parse(readFileSync(`produzione/${corso}/_fonte-note.json`, "utf8")) : {};
const ore = (h) => (h === 1 ? "1 ora" : `${h} ore`);
const step = (c) => `[STEP DI CONTROLLO DEL COMMITTENTE]\nDomanda: ${testo(c.q)}\n${c.o.map((o, j) => `- ${testo(o)}${j === c.a ? " → CORRETTA" : ""}`).join("\n")}\nSpiegazione: ${testo(c.why)}`;

const checkpoint = [];
C.modules.forEach((m, i) => {
  const mod = `m${String(i + 1).padStart(2, "0")}`;
  if (m.id !== i + 1) throw new Error(`moduli fuori sequenza: posizione ${i + 1}, id ${m.id}`);
  let txt = `# UNITÀ ${m.id} — ${m.title} (${ore(m.hours)})\n\n`;
  const nota = [note.tutti, note[mod]].filter(Boolean).join("\n\n");
  if (nota) txt += `NOTA DI PRODUZIONE (da rispettare, non da dire in voce): ${nota}\n\n`;
  txt += `Obiettivi del modulo (committente): ${m.obj.map(testo).join(" · ")}\n\n`;
  let k = 0;
  if (i === 0) {
    // via le righe dell'interfaccia del committente (campo nome, modalità del suo player): la piattaforma è un'altra
    const cover = testo(app.cover()).split("\n").filter((r) => !/^(Nome e cognome del discente|Modalità di fruizione)/.test(r)).join("\n");
    txt += `## SEZIONE 0 — Presentazione del corso (introduzione del committente)\n\n### SCHERMATA ${++k} — ${C.title} [presentazione]\n${cover}\n\n`;
  }
  m.slides.forEach((s, si) => {
    txt += `## SEZIONE ${si + 1} — ${testo(s.t)}\n\n`;
    for (const b of blocchi(s)) txt += `### SCHERMATA ${++k} — ${b.titolo} [slide ${si + 1}]\n${b.corpo}\n\n`;
    for (const c of m.checkpoints.filter((c) => c.after === si + 1)) txt += `${step(c)}\n\n`;
  });
  if (note.legge?.[mod]) txt += `## RIFERIMENTO DI LEGGE VIGENTE (testo ufficiale da Normattiva — per la verifica dei riferimenti, NON una sezione da narrare né da leggere)\n\n${note.legge[mod].trim()}\n`;
  if (/\$\{|=>|function\(/.test(txt)) throw new Error(`${mod}: resta codice non renderizzato`);
  writeFileSync(`${out}/${mod}.txt`, txt);
  for (const c of m.checkpoints) checkpoint.push({ modulo: mod, fonte: "step", dopoSlide: c.after, domanda: testo(c.q), opzioni: c.o.map(testo), corretta: c.a, spiegazione: testo(c.why) });
  for (const q of m.quiz) checkpoint.push({ modulo: mod, fonte: "test", domanda: testo(q.q), opzioni: q.o.map(testo), corretta: q.a });
  const parole = txt.split("## RIFERIMENTO DI LEGGE")[0].split(/\s+/).length;
  console.log(`${mod}: ${m.title} · ${m.slides.length} slide del committente · ${k} schermate · ${parole} parole · step ${m.checkpoints.length} · test ${m.quiz.length}`);
});
writeFileSync(`${out}/quiz.json`, JSON.stringify({
  parametri: { ore: C.hours, test: C.quizN ? `${C.quizPass}/${C.quizN}` : `soglia ${C.threshold}`, esame: C.finalN ? `${C.finalPass}/${C.finalN}` : `soglia ${C.threshold}` },
  checkpoint,
  esame: C.final.map((d) => ({ modulo: null, domanda: testo(d.q), opzioni: d.o.map(testo), corretta: d.a })),
}, null, 2) + "\n");
console.log(`step+test ${checkpoint.length} · domande d'esame ${C.final.length} (modulo da assegnare a mano)`);
