// Estrae il contenuto didattico del corso FAD-PAS24000-01 (10 HTML del committente, uno per unità)
// nel formato della fabbrica: _fonte/<mNN>.txt (una sezione per schermata, con i dati dei grafici e
// il commento del docente) + _fonte/quiz.json (checkpoint ed esami di unità, base delle banche).
// A differenza del PdR 125 i contenuti NON sono costruiti da funzioni: ogni HTML porta i dati in
// `window.UNIT = {...}` (JSON puro), quindi si leggono con JSON.parse senza eseguire nulla.
// Unità N → modulo mNN (10 unità = 10 moduli, durate del programma del committente).
// Uso: node scripts/produzione/_estrai-fonte-pas24000.mjs <cartella html> <corso>
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";

const [dir, corso] = process.argv.slice(2);
if (!dir || !corso) { console.error("Uso: _estrai-fonte-pas24000.mjs <cartella html> <corso>"); process.exit(2); }
const out = `produzione/${corso}/_fonte`;
mkdirSync(out, { recursive: true });

const pulisci = (s) => String(s ?? "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\s+/g, " ").trim();
const num = (v) => (typeof v === "number" ? v.toLocaleString("it-IT", { maximumFractionDigits: 1 }) : pulisci(v));
const voci = (lista) => (lista ?? []).map((b) => (typeof b === "string" ? `- ${pulisci(b)}` : `- ${pulisci(b.t)}${b.d ? `: ${pulisci(b.d)}` : ""}`));

// un renderer per ogni tipo di schermata del motore del committente (stessi campi di R.* nell'HTML)
const R = {
  section: (s) => [pulisci(s.text), ...voci(s.points)],
  text: (s) => [pulisci(s.lead), ...voci(s.bullets), s.aside ? `Riquadro «${pulisci(s.aside.title)}»: ${pulisci(s.aside.text)}` : ""],
  cards: (s) => [pulisci(s.lead), ...s.cards.map((c) => `- ${c.tag ? `[${pulisci(c.tag)}] ` : ""}${pulisci(c.title)}: ${pulisci(c.text)}`)],
  two: (s) => [pulisci(s.lead), `Colonna «${pulisci(s.left.title)}»:`, ...voci(s.left.bullets), `Colonna «${pulisci(s.right.title)}»:`, ...voci(s.right.bullets)],
  table: (s) => [pulisci(s.lead), `Colonne: ${s.head.map(pulisci).join(" | ")}`, ...s.rows.map((r) => `- ${r.map(pulisci).join(" | ")}`), pulisci(s.foot)],
  flow: (s) => [pulisci(s.lead), ...s.steps.map((x, i) => `${i + 1}. ${pulisci(x.t)}${x.d ? `: ${pulisci(x.d)}` : ""}`), pulisci(s.foot)],
  cycle: (s) => [pulisci(s.lead), s.center ? `Al centro: ${pulisci(s.center)}` : "", ...voci(s.items), pulisci(s.foot)],
  hub: (s) => R.cycle(s),
  pyramid: (s) => [pulisci(s.lead), "Livelli, dall'alto al basso:", ...voci(s.levels), pulisci(s.foot)],
  funnel: (s) => [pulisci(s.lead), ...s.stages.map((x) => `- ${pulisci(x.l)}: ${num(x.v)}${pulisci(s.unit)}`)],
  bar: (s) => [pulisci(s.lead), ...s.data.map((d) => `- ${pulisci(d.l)}: ${num(d.v)}${pulisci(s.unit)}`)],
  gbar: (s) => [pulisci(s.lead), `Serie: ${s.series.map(pulisci).join(" | ")}`, ...s.data.map((d) => `- ${pulisci(d.l)}: ${d.v.map((v) => num(v) + pulisci(s.unit)).join(" | ")}`)],
  donut: (s) => {
    const tot = s.data.reduce((a, d) => a + d.v, 0);
    return [pulisci(s.lead), s.center ? `Totale al centro: ${pulisci(s.center)} ${pulisci(s.centerLabel)}` : "",
      ...s.data.map((d) => `- ${pulisci(d.l)}: ${num(d.v)}${pulisci(s.unit)} (${num((100 * d.v) / tot)}%)`)];
  },
  line: (s) => [pulisci(s.lead), `Periodi: ${s.labels.map(pulisci).join(" | ")}`, ...s.series.map((x) => `- ${pulisci(x.name)}: ${x.v.map((v) => num(v) + pulisci(s.unit)).join(" | ")}`)],
  radar: (s) => [pulisci(s.lead), `Scala 0-${s.max || 5}`, ...s.series.map((x) => `- ${pulisci(x.name)}: ${s.axes.map((a, i) => `${pulisci(a)} ${num(x.v[i])}`).join("; ")}`)],
  matrix: (s) => [pulisci(s.lead), `Assi: ${pulisci(s.xLabel || "Probabilità")} × ${pulisci(s.yLabel || "Gravità")}`,
    ...s.points.map((x) => `- ${pulisci(x.id)} ${pulisci(x.l)}: P${x.p} × G${x.g} = ${x.p * x.g}`)],
  timeline: (s) => [pulisci(s.lead), ...s.events.map((e) => `- ${pulisci(e.when)} — ${pulisci(e.t)}${e.d ? `: ${pulisci(e.d)}` : ""}`)],
  tree: (s) => {
    const r = s.root;
    return [pulisci(s.lead), `Radice: ${pulisci(r.t)}${r.d ? ` (${pulisci(r.d)})` : ""}`,
      ...r.children.map((c) => `- ${pulisci(c.t)}${c.d ? ` (${pulisci(c.d)})` : ""}${c.items ? `: ${c.items.map(pulisci).join("; ")}` : ""}`), pulisci(s.foot)];
  },
  stats: (s) => [pulisci(s.lead), ...s.stats.map((x) => `- ${pulisci(x.v)}: ${pulisci(x.l)}${x.s ? ` (${pulisci(x.s)})` : ""}`)],
  case: (s) => [pulisci(s.context), ...voci(s.facts), s.question ? `Domanda di lavoro: ${pulisci(s.question)}` : "", s.solution ? `Come ha operato l'azienda: ${pulisci(s.solution)}` : ""],
  checklist: (s) => [pulisci(s.lead), ...voci(s.items)],
  key: (s) => [pulisci(s.text), ...voci(s.points)],
  defs: (s) => [pulisci(s.lead), ...s.items.map((i) => `- ${pulisci(i.term)}: ${pulisci(i.def)}`)],
  quad: (s) => [pulisci(s.lead), s.xLabel || s.yLabel ? `Assi: ${pulisci(s.xLabel)} / ${pulisci(s.yLabel)}` : "",
    ...s.quadrants.map((q) => `- ${pulisci(q.t)}: ${q.items.map(pulisci).join("; ")}`)],
  gantt: (s) => [pulisci(s.lead), ...s.tasks.map((t) => `- ${pulisci(t.t)}: ${s.periods[t.start - 1]} → ${s.periods[t.end - 1]}`)],
  meters: (s) => [pulisci(s.lead), ...s.rows.map((r) => `- ${pulisci(r.l)}: rilevato ${num(r.v)}${pulisci(r.unit)}, obiettivo ${num(r.target)}${pulisci(r.unit)}${r.lowerIsBetter ? " (meglio se più basso)" : ""}`)],
  summary: (s) => [pulisci(s.lead), ...s.points.map((p, i) => `${i + 1}. ${pulisci(p)}`)],
};

const file = readdirSync(dir).filter((f) => /^FAD-PAS24000-01_UD\d\d\.html$/.test(f)).sort();
if (file.length !== 10) throw new Error(`attese 10 unità, trovate ${file.length}`);
const checkpoint = [], esame = [], tipi = {};
let totale = 0;
for (const f of file) {
  const html = readFileSync(`${dir}/${f}`, "utf8");
  const m = html.match(/window\.UNIT = (\{[\s\S]*?\});\n<\/script>/);
  if (!m) throw new Error(`${f}: blocco window.UNIT non trovato`);
  const U = JSON.parse(m[1]);
  const mod = `m${String(U.unit).padStart(2, "0")}`;
  if (f !== `FAD-PAS24000-01_UD${mod.slice(1)}.html`) throw new Error(`${f}: numero di unità ${U.unit} non coerente col nome`);
  const righe = [`# UNITÀ ${U.unit} — ${pulisci(U.title)} (${pulisci(U.hours)})`, pulisci(U.subtitle),
    "Obiettivi di apprendimento:", ...U.objectives.map((o) => `- ${pulisci(o)}`)];
  let n = 0;
  U.sections.forEach((sec, si) => {
    righe.push(`\n## SEZIONE ${si + 1} — ${pulisci(sec.title)}`);
    sec.slides.forEach((s) => {
      tipi[s.type] = (tipi[s.type] ?? 0) + 1;
      if (s.type === "checkpoint") {
        s.questions.forEach((q) => checkpoint.push({ modulo: mod, sezione: si + 1, domanda: pulisci(q.q), opzioni: q.options.map(pulisci), corretta: q.answer, spiegazione: pulisci(q.why) }));
        return; // le domande vanno nella banca, non nella fonte del copione
      }
      const fn = R[s.type];
      if (!fn) throw new Error(`${f}: tipo di schermata sconosciuto «${s.type}»`);
      n++;
      const corpo = fn(s).filter(Boolean);
      righe.push(`### SCHERMATA ${n} — ${pulisci(s.title)} [${s.type}${s.ref ? ` · ${pulisci(s.ref)}` : ""}]`, ...corpo,
        s.source ? `Fonte dei dati: ${pulisci(s.source)}` : "", s.note ? `Commento del docente: ${pulisci(s.note)}` : "");
    });
  });
  U.exam.forEach((q) => esame.push({ modulo: mod, domanda: pulisci(q.q), opzioni: q.options.map(pulisci), corretta: q.answer, spiegazione: pulisci(q.why) }));
  const txt = righe.filter((r) => r !== "").join("\n") + "\n";
  if (/undefined|\[object Object\]|NaN/.test(txt)) throw new Error(`${mod}: campo non letto (undefined/object/NaN) nel testo`);
  writeFileSync(`${out}/${mod}.txt`, txt);
  const parole = txt.split(/\s+/).length;
  totale += parole;
  console.log(`${mod}: ${pulisci(U.hours)} · ${U.sections.length} sezioni · ${n} schermate · ${parole} parole · ${pulisci(U.title)}`);
}
writeFileSync(`${out}/quiz.json`, JSON.stringify({ checkpoint, esame }, null, 2) + "\n");
console.log(`totale ${totale} parole · checkpoint ${checkpoint.length} · domande d'esame ${esame.length}`);
console.log(`tipi di schermata: ${JSON.stringify(tipi)}`);
