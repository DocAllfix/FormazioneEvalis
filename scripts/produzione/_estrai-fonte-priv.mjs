// Estrae il contenuto didattico dei corsi privacy FAD-PRIV-01/02/03 (un HTML ciascuno, stesso motore:
// costanti MODS ed EXAM nello script) nel formato della fabbrica: _fonte/<mNN>.txt (una sezione per
// modulo del committente, una schermata per slide, esercizi con la soluzione) + _fonte/quiz.json
// (checkpoint e domande d'esame del committente, base delle banche domande).
// Lo script del corso si ESEGUE in un contesto isolato (vm, DOM finto e muto) per leggere MODS ed EXAM
// esattamente come li vede il discente. Gli esercizi di PRIV-01 e PRIV-02 hanno i dati dentro il codice
// di initLock: si leggono dal sorgente della funzione.
// Il modulo 0 (presentazione) del committente confluisce nel nostro m01; i moduli 1..N diventano m01..mNN.
// Uso: node scripts/produzione/_estrai-fonte-priv.mjs <file.html> <corso>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";

const [file, corso] = process.argv.slice(2);
if (!file || !corso) { console.error("Uso: _estrai-fonte-priv.mjs <file.html> <corso>"); process.exit(2); }
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
};
vm.createContext(ctx);
vm.runInContext(`${codice}\n;globalThis.__M = MODS; globalThis.__E = EXAM;`, ctx, { timeout: 10000 });
const MODS = ctx.__M, EXAM = ctx.__E;

const testo = (h) => String(h ?? "")
  .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, (m) => (m.startsWith("<svg") ? m.replace(/<text[^>]*>([^<]*)<\/text>/g, "\n$1\n").replace(/<[^>]+>/g, " ") : " "))
  .replace(/<\/(p|div|li|h[1-6]|tr|section|button|label)>/g, "\n")
  .replace(/<\/t[dh]>/g, " | ")
  .replace(/<br\s*\/?>/g, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, " ")
  .split("\n").map((r) => r.trim().replace(/\s*\|\s*$/, "")).filter(Boolean).join("\n");

// --- esercizi: dati nella slide (PRIV-03) oppure nel codice di initLock (PRIV-01/02)
const sorgenteLock = (k) => {
  const i = codice.indexOf(`if(k==='${k}')`);
  if (i < 0) return null;
  const j = codice.indexOf("\n  if(", i + 5);
  return codice.slice(i, j < 0 ? undefined : j);
};
const coppie = (src) => [...src.matchAll(/\['((?:[^'\\]|\\.)*)',\s*('?[\w]+'?)\]/g)].map((m) => [m[1], m[2].replace(/'/g, "")]);
function esercizio(s) {
  const ex = s.ex;
  if (ex) {
    if (ex.type === "bin") return [ex.intro, ...ex.items.map(([t, v]) => `- ${t} → ${ex.labels[v]}`), `Esito: ${ex.done}`];
    if (ex.type === "cat") {
      const cat = Object.fromEntries(ex.cats);
      return [ex.intro, ...ex.items.map(([t, v]) => `- ${t} → ${cat[v]}`), `Esito: ${ex.done}`];
    }
    if (ex.type === "order") return [ex.intro, "Ordine corretto:", ...ex.steps.map((t, i) => `${i + 1}. ${t}`), `Esito: ${ex.done}`];
    if (ex.type === "case") return [ex.q, ...ex.o.map((o, i) => `- ${o}${i === ex.a ? " → CORRETTA" : ""}`), `Spiegazione: ${ex.ok}`];
    throw new Error(`tipo esercizio sconosciuto: ${ex.type}`);
  }
  const k = s.lock;
  // PRIV-02: vf/msg/ret nell'oggetto cfg; casi c1..cN nell'oggetto ans (opzioni già nel corpo slide)
  const cfg = codice.match(new RegExp(`${k}:\\{items:\\[([\\s\\S]*?)\\],labels:\\[([^\\]]*)\\],done:'((?:[^'\\\\]|\\\\.)*)'\\}`));
  if (cfg) {
    const labels = [...cfg[2].matchAll(/'([^']*)'/g)].map((m) => m[1]);
    return [...coppie(cfg[1]).map(([t, v]) => `- ${t} → ${labels[+v]}`), `Esito: ${cfg[3]}`];
  }
  const ans = codice.match(new RegExp(`${k}:\\[(\\d+),'((?:[^'\\\\]|\\\\.)*)','((?:[^'\\\\]|\\\\.)*)'\\]`));
  if (ans) return [`Risposta corretta: opzione ${+ans[1] + 1}`, `Spiegazione: ${ans[2]}`];
  const src = sorgenteLock(k);
  if (!src) throw new Error(`esercizio ${k}: dati non trovati`);
  const righe = [];
  const ps = coppie(src);
  if (k === "cls") { const c = { c: "Dato comune", p: "Categoria particolare", n: "Non è un dato personale" }; ps.filter(([, v]) => c[v]).forEach(([t, v]) => righe.push(`- ${t} → ${c[v]}`)); }
  else if (k === "roles") { const r = { t: "Titolare", r: "Responsabile", a: "Autorizzato", i: "Interessato" }; ps.filter(([t]) => !Object.values(r).includes(t) && !["t", "r", "a", "i"].includes(t)).forEach(([t, v]) => r[v] && righe.push(`- ${t} → ${r[v]}`)); }
  else if (k === "desk") ps.forEach(([t, v]) => righe.push(`- ${t} → ${v === "1" ? "violazione" : "corretto"}`));
  else if (k === "order") { const st = src.match(/const steps=\[([\s\S]*?)\];/)[1]; [...st.matchAll(/'((?:[^'\\]|\\.)*)'/g)].forEach((m, i) => righe.push(`${i + 1}. ${m[1]}`)); }
  else if (k === "phish") { const w = src.match(/const why=\{([\s\S]*?)\};/)[1]; [...w.matchAll(/\d:'((?:[^'\\]|\\.)*)'/g)].forEach((m) => righe.push(`- segnale: ${m[1]}`)); }
  else if (k === "pwd") righe.push("Valutatore di robustezza: almeno 12 caratteri, maiuscole e minuscole, cifre, simboli, nessuna parola prevedibile (nome azienda, anno, password).");
  const fine = [...src.matchAll(/textContent='((?:[^'\\]|\\.)*)'|innerHTML\+='((?:[^'\\]|\\.)*)'/g)].map((m) => (m[1] ?? m[2]).replace(/<br>/g, " ")).filter((t) => t.length > 60 && /^(Corretto|Tutti|Sequenza)/.test(t));
  if (fine.length) righe.push(`Esito: ${fine[fine.length - 1]}`);
  if (!righe.length) throw new Error(`esercizio ${k}: nessun dato letto`);
  return righe;
}

const mods = MODS.filter((m) => m.slides.length);
const nostri = []; // [{mod, sezioni:[{titolo, schermate:[...]}], quiz:[]}]
for (const m of mods) {
  const sez = { titolo: `Modulo ${m.n} del committente — ${m.t} (${m.min} min)`, schermate: [] };
  for (const s of m.slides) {
    const corpo = [testo(s.b)];
    if (s.lock) corpo.push(`[ESERCIZIO PRECLUSIVO]\n${esercizio(s).map(testo).join("\n")}`);
    sez.schermate.push(`### SCHERMATA — ${testo(s.h)}\n${corpo.filter(Boolean).join("\n")}`);
  }
  if (m.n === "0") nostri.push({ sezioni: [sez], quiz: [] });
  else if (nostri.length === 1 && nostri[0].sezioni.length === 1 && mods[0].n === "0" && !nostri[0].chiuso) {
    nostri[0].sezioni.push(sez); nostri[0].quiz = m.quiz; nostri[0].chiuso = true;
  } else nostri.push({ sezioni: [sez], quiz: m.quiz, chiuso: true });
}
const checkpoint = [];
nostri.forEach((n, i) => {
  const mod = `m${String(i + 1).padStart(2, "0")}`;
  n.mod = mod;
  let k = 0;
  const txt = n.sezioni.map((s, si) => `## SEZIONE ${si + 1} — ${s.titolo}\n\n` + s.schermate.map((x) => x.replace("### SCHERMATA —", `### SCHERMATA ${++k} —`)).join("\n\n")).join("\n\n") + "\n";
  if (/\$\{|=>|function\(/.test(txt)) throw new Error(`${mod}: resta codice non renderizzato`);
  writeFileSync(`${out}/${mod}.txt`, txt);
  for (const q of n.quiz) checkpoint.push({ modulo: mod, domanda: testo(q.q), opzioni: q.o.map(testo), corretta: q.a });
  console.log(`${mod}: ${n.sezioni.map((s) => s.titolo).join(" + ")} · ${k} schermate · ${txt.split(/\s+/).length} parole · checkpoint ${n.quiz.length}`);
});
writeFileSync(`${out}/quiz.json`, JSON.stringify({
  checkpoint,
  esame: EXAM.map((d) => ({ modulo: null, domanda: testo(d.q), opzioni: d.o.map(testo), corretta: d.a })),
}, null, 2) + "\n");
console.log(`checkpoint ${checkpoint.length} · domande d'esame ${EXAM.length} (modulo da assegnare a mano)`);
