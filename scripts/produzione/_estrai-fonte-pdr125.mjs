// Estrae il contenuto didattico del corso FAD-PDR125-01 (un solo HTML del committente) nel formato
// della fabbrica: _fonte/<mNN>.txt (una sezione per schermata) + _fonte/quiz.json (checkpoint e
// domande d'esame del committente, base delle banche domande).
// Le schermate sono costruite da funzioni JS (H, L, CARDS, costanti K...): invece di leggerle come
// testo si ESEGUE lo script del corso in un contesto isolato (vm, DOM finto e muto) e si leggono le
// schermate già renderizzate (array S) e le domande (T1, T2) — esattamente ciò che vede il discente.
// Le sezioni HTML si raggruppano in 6 moduli da ~80 min (vedi struttura.md).
// Uso: node scripts/produzione/_estrai-fonte-pdr125.mjs <file.html> <corso>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";

const [file, corso] = process.argv.slice(2);
if (!file || !corso) { console.error("Uso: _estrai-fonte-pdr125.mjs <file.html> <corso>"); process.exit(2); }
const out = `produzione/${corso}/_fonte`;
mkdirSync(out, { recursive: true });

const MODULI = { m01: [0, 1, 2], m02: [3, 4, 5, 6], m03: [7, 8, 9, 10], m04: [12, 13, 14], m05: [15, 16, 17, 18], m06: [19, 20, 21, 22] };

const html = readFileSync(file, "utf8");
const codice = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
const muto = new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => "" : muto),
  apply: () => muto, construct: () => muto, set: () => true,
});
const ctx = {
  console, document: muto, window: muto, navigator: muto, location: muto, history: muto,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener() {}, setTimeout() {}, setInterval() {}, requestAnimationFrame() {},
};
vm.createContext(ctx);
vm.runInContext(`${codice}\n;globalThis.__S = S; globalThis.__T = [T1, T2];`, ctx, { timeout: 10000 });
const S = ctx.__S, [T1, T2] = ctx.__T;
const titoliSez = Object.fromEntries([...codice.matchAll(/SEZIONE (\d+) · ([^=]+?) =/g)].map((m) => [+m[1], m[2].trim()]));

const testo = (h) => String(h ?? "")
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
  .replace(/<\/(p|div|li|h[1-6]|tr|section|td|th)>/g, "\n")
  .replace(/<br\s*\/?>/g, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, " ")
  .split("\n").map((r) => r.trim()).filter(Boolean).join("\n");

const schermate = S.filter((x) => !x.cp);
let totale = 0;
for (const [mod, sezioni] of Object.entries(MODULI)) {
  const righe = [];
  for (const s of sezioni) {
    const sch = schermate.filter((x) => x.sec === s);
    if (sch.length === 0) throw new Error(`sezione ${s} senza schermate`);
    righe.push(`## SEZIONE ${s} — ${titoliSez[s] ?? ""}`);
    sch.forEach((x, i) => righe.push(`### SCHERMATA ${i + 1} — ${testo(x.title)}\n${testo(x.html)}`));
  }
  const txt = righe.join("\n\n") + "\n";
  if (/\$\{|=>/.test(txt)) throw new Error(`${mod}: resta codice non renderizzato nel testo`);
  writeFileSync(`${out}/${mod}.txt`, txt);
  const parole = txt.split(/\s+/).length;
  totale += parole;
  console.log(`${mod}: sezioni ${sezioni.join(",")} · ${righe.length - sezioni.length} schermate · ${parole} parole`);
}
const usate = new Set(Object.values(MODULI).flat());
const fuori = [...new Set(schermate.map((x) => x.sec))].filter((s) => !usate.has(s));
console.log(`sezioni non assegnate a un modulo (verifiche, da controllare): ${fuori.join(",") || "nessuna"}`);

const checkpoint = S.filter((x) => x.cp).map((x) => ({
  sezione: x.sec, domanda: testo(x.cp.q), opzioni: x.cp.opts.map(testo), corretta: x.cp.a, spiegazione: testo(x.cp.ok),
}));
const esame = [[1, T1], [2, T2]].flatMap(([parte, T]) => T.map((d) => ({
  parte, domanda: testo(d.q), opzioni: d.o.map(testo), corretta: d.a, spiegazione: testo(d.ex), rivedi: d.rv,
})));
writeFileSync(`${out}/quiz.json`, JSON.stringify({ checkpoint, esame }, null, 2) + "\n");
console.log(`totale ${totale} parole · checkpoint ${checkpoint.length} · domande d'esame ${esame.length} (parte 1: ${T1.length}, parte 2: ${T2.length})`);
