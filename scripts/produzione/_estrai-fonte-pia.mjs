// Estrae il contenuto didattico del corso FAD-PIA-01 Piastrellista (un solo HTML del committente:
// array COURSE con intro, sei moduli di teoria M1-M6, otto esercitazioni E1-E8, esame) nel formato
// della fabbrica: _fonte/<mNN>.txt (una schermata per slide del committente) + _fonte/quiz.json.
// Lo script del corso si ESEGUE in un contesto isolato (vm, DOM finto e muto) per leggere COURSE
// esattamente come lo vede il discente. Le esercitazioni hanno i dati in html() e le soluzioni in
// check(v): le risposte giuste delle tendine si ricavano provando ogni opzione (quella che toglie un
// errore è accettata), quelle numeriche dai messaggi di correzione del committente.
// Mappa: intro + M1 → m01, M2..M6 → m02..m06, E1..E8 → m07..m14.
// Edizione: il committente cita la UNI 11493-1:2016, il corso usa la 2025 (in vigore dal maggio 2025,
// scelta dell'utente del 28/10/2026). Il testo della norma non c'è: la NOTA in testa a ogni modulo
// dice al generatore di usare i valori del committente senza attribuirli a un punto della norma.
// Uso: node scripts/produzione/_estrai-fonte-pia.mjs <file.html> <corso>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";

const [file, corso] = process.argv.slice(2);
if (!file || !corso) { console.error("Uso: _estrai-fonte-pia.mjs <file.html> <corso>"); process.exit(2); }
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
vm.runInContext(`${codice}\n;globalThis.__C = COURSE;`, ctx, { timeout: 10000 });
const COURSE = ctx.__C;

const testo = (h) => String(h ?? "")
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
  .replace(/<select[\s\S]*?<\/select>/g, " [scelta] ")
  .replace(/<input[^>]*>/g, " [valore] ")
  .replace(/<\/(p|div|li|h[1-6]|tr|section)>/g, "\n")
  .replace(/<\/t[dh]>/g, " | ")
  .replace(/<br\s*\/?>/g, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, " ")
  .split("\n").map((r) => r.trim().replace(/\s*\|\s*$/, "")).filter(Boolean).join("\n")
  .replace(/UNI 11493-1:2016/g, "UNI 11493-1:2025");

const NOTA = "NOTA DI PRODUZIONE (da rispettare, non da dire in voce): l'edizione in vigore è la UNI 11493-1:2025, " +
  "pubblicata nel maggio 2025, che ha sostituito l'edizione del 2016. Il testo della norma non è disponibile: i valori " +
  "numerici qui sotto (soglie, tolleranze, dimensioni, classi, tempi) sono i valori di riferimento del corso. Usali così " +
  "come sono, senza attribuirli a un punto, a un prospetto o a un paragrafo della norma, e senza aggiungere valori, " +
  "requisiti o contenuti della norma che qui non compaiono. Nei casi di cantiere e nei calcoli guidati puoi usare dati " +
  "di esempio tuoi (superfici, formati e spessori delle piastrelle, numero e tipo di locali), purché i conti seguano le " +
  "formule del corso e siano esatti, e i valori tecnici (soglie, tolleranze, classi, consumi unitari, fughe minime, " +
  "dimensioni dei campi) restino quelli qui sotto. Dove conta il prodotto, prevale la scheda tecnica del produttore " +
  "quando è più restrittiva.";

// campi dell'esercitazione: tendine (con opzioni) e caselle numeriche, nell'ordine della pagina
function campi(h) {
  const out = [];
  for (const m of h.matchAll(/<select data-f='(\w+)'>([\s\S]*?)<\/select>|<input[^>]*data-f='(\w+)'[^>]*>/g)) {
    if (m[1]) out.push({ f: m[1], opzioni: [...m[2].matchAll(/<option value='([^']+)'>/g)].map((o) => o[1]) });
    else out.push({ f: m[3], opzioni: null });
  }
  return out;
}

function esercitazione(c) {
  const h = c.html();
  const cs = campi(h);
  const vuoto = Object.fromEntries(cs.map((x) => [x.f, ""]));
  const righe = [testo(h), "", "[ESERCITAZIONE PRECLUSIVA — soluzione del committente]"];
  if (c.id === "e7") {
    // sequenza: la soluzione è l'oggetto corr nel codice di check
    const corr = JSON.parse(String(c.check).match(/var corr=(\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":'));
    const passi = [...h.matchAll(/<span>([^<]+)<\/span>/g)].map((m) => m[1]);
    passi.map((p, i) => [Number(corr[`s${i}`]), p]).sort((a, b) => a[0] - b[0]).forEach(([n, p]) => righe.push(`${n}. ${p}`));
    return righe;
  }
  const base = c.check(vuoto).length;
  for (const x of cs.filter((x) => x.opzioni)) {
    const giuste = x.opzioni.filter((o) => c.check({ ...vuoto, [x.f]: o }).length < base);
    if (!giuste.length) throw new Error(`${c.id}.${x.f}: nessuna opzione accettata`);
    righe.push(`- campo ${x.f}: accettate ${giuste.map((g) => `«${g}»`).join(", ")}`);
  }
  righe.push("Correzioni del committente (spiegano ogni risposta):");
  c.check(vuoto).forEach((e) => righe.push(`- ${e}`));
  return righe;
}

const moduli = [];
const intro = COURSE.find((c) => c.id === "intro");
for (const c of COURSE.filter((c) => c.type === "theory" || c.type === "exercise")) {
  if (c.id === "intro") continue;
  const sezioni = [];
  if (c.id === "m1") sezioni.push({ titolo: `${intro.title} (introduzione del committente)`, schermate: intro.slides.map((s) => [s.h, testo(s.html)]) });
  if (c.type === "theory") sezioni.push({ titolo: `${c.title} (${c.hours} ore)`, schermate: c.slides.map((s) => [`${s.k} ${s.h}`, testo(s.html)]) });
  else sezioni.push({ titolo: `${c.title} (${c.hours} ore) — riferimento teorico ${c.refName}`, schermate: [[c.title, esercitazione(c).join("\n")]] });
  moduli.push({ c, sezioni });
}

// Fugante: il committente mette i lati in cm nella formula (A+B)/(A×B)×C×D×1,6, che i produttori usano
// coi lati in mm; in cm il consumo esce 10 volte troppo alto (60×60, sp. 10, fuga 3: 1,6 invece di
// 0,16 kg/m²). Correzione scelta dall'utente il 28/10/2026; ogni sostituzione deve trovare il suo testo.
const FUGANTE = {
  m04: [["A, B = lati piastrella (cm)", "A, B = lati piastrella (mm)"],
    ["(120/3600) × 10 × 3 × 1,6 = 1,6 kg/m²", "(1200/360000) × 10 × 3 × 1,6 = 0,16 kg/m²"]],
  m09: [["(120/3600)×10×3×1,6 = 1,6 kg/m²", "(1200/360000)×10×3×1,6 = 0,16 kg/m²"],
    ["1,6 × 45 = 72 kg", "0,16 × 45 = 7,2 kg"]],
};
const correggi = (mod, txt) => (FUGANTE[mod] ?? []).reduce((t, [da, a]) => {
  if (!t.includes(da)) throw new Error(`${mod}: correzione fugante non applicata: ${da}`);
  return t.replace(da, a);
}, txt);

const checkpoint = [];
moduli.forEach(({ c, sezioni }, i) => {
  const mod = `m${String(i + 1).padStart(2, "0")}`;
  let k = 0;
  const txt = correggi(mod, `# ${c.title} (${c.hours} ore)\n\n${NOTA}\n\n` + sezioni.map((s, si) => `## SEZIONE ${si + 1} — ${s.titolo}\n\n` +
    s.schermate.map(([t, b]) => `### SCHERMATA ${++k} — ${t}\n${b}`).join("\n\n")).join("\n\n") + "\n");
  if (/\$\{|=>|function\(/.test(txt)) throw new Error(`${mod}: resta codice non renderizzato`);
  writeFileSync(`${out}/${mod}.txt`, txt);
  for (const q of c.check && c.type === "theory" ? c.check : []) checkpoint.push({ modulo: mod, domanda: testo(q.q), opzioni: q.o.map(testo), corretta: q.a });
  console.log(`${mod}: ${c.title} · ${c.hours} h · ${k} schermate · ${txt.split(/\s+/).length} parole`);
});
const exam = COURSE.find((c) => c.type === "exam");
const esame = exam.qs.map((d) => ({ modulo: null, domanda: testo(d.q), opzioni: d.o.map(testo), corretta: d.a }));
const q9 = esame.find((d) => d.domanda.includes("(90/1800)×9×3×1,6"));
if (!q9 || q9.opzioni.join("|") !== "1,2 kg/m²|2,2 kg/m²|0,6 kg/m²") throw new Error("correzione fugante: domanda d'esame cambiata");
q9.domanda = q9.domanda.replace("(90/1800)", "(900/180000)");
q9.opzioni = ["0,12 kg/m²", "0,22 kg/m²", "0,06 kg/m²"];
writeFileSync(`${out}/quiz.json`, JSON.stringify({
  checkpoint,
  esame,
  soglia_esame: `${exam.pass}/${exam.qs.length}`,
}, null, 2) + "\n");
console.log(`checkpoint ${checkpoint.length} · domande d'esame ${exam.qs.length} (soglia ${exam.pass}/${exam.qs.length})`);
