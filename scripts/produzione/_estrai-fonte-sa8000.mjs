// Estrae il contenuto didattico del corso FAD-SA8000-02 (un HTML del committente: costante COURSE =
// [{ t, d, s: [{ t, k, h, cards|opts|items|cats|steps|qs|calc }] }]) nel formato della fabbrica:
// _fonte/<mNN>.txt (un modulo del committente = un nostro modulo; una sezione per slide del committente;
// le attività interattive restano dove le mette il committente, con soluzioni e spiegazioni) + _fonte/quiz.json
// (test di fine modulo = base dei checkpoint, esame finale = base dell'esame).
// Il blocco «Come funziona» della prima slide e la slide «Attestato» descrivono il player del committente:
// non sono contenuto (la piattaforma è un'altra) e non vengono estratti.
// Note di produzione in testa ai moduli da produzione/<corso>/_fonte-note.json: { "tutti": "...", "m01": "..." }.
// Uso: node scripts/produzione/_estrai-fonte-sa8000.mjs <file.html> <corso>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import vm from "node:vm";

const [file, corso] = process.argv.slice(2);
if (!file || !corso) { console.error("Uso: _estrai-fonte-sa8000.mjs <file.html> <corso>"); process.exit(2); }
const out = `produzione/${corso}/_fonte`;
mkdirSync(out, { recursive: true });

const html = readFileSync(file, "utf8");
const codice = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
const corpo = codice.slice(0, codice.indexOf("/* ===================== MOTORE"));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${corpo.replace(/^"use strict";/, "")}\n;globalThis.__C = COURSE;`, ctx, { timeout: 10000 });
const C = ctx.__C;

const testo = (h) => String(h ?? "")
  .replace(/<\/(p|div|li|h[1-6]|tr|summary|details)>/g, "\n")
  .replace(/<summary>/g, "\n").replace(/<\/t[dh]>/g, " | ")
  .replace(/<small>/g, " (").replace(/<\/small>/g, ")")
  .replace(/<br\s*\/?>/g, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, " ").replace(/ \)/g, ")").replace(/ ([,.;:])(?=\s|$)/gm, "$1")
  .split("\n").map((r) => r.trim().replace(/\s*\|\s*$/, "")).filter(Boolean).join("\n");

// slide → blocchi titolati (h2): sono gli argomenti slide per slide della struttura
function blocchi(t, h) {
  const res = [];
  for (const p of String(h ?? "").split(/(?=<h2[^>]*>)/)) {
    const m = p.match(/^<h2[^>]*>([\s\S]*?)<\/h2>/);
    const titolo = m ? testo(m[1]).replace(/\n/g, " ") : t;
    if (titolo === "Come funziona") continue; // istruzioni del player del committente
    const c = testo(m ? p.slice(m[0].length) : p);
    if (!c && !m) continue;
    res.push({ titolo, corpo: c });
  }
  return res;
}

const CALC = {
  risk: "Calcolatore del committente (scala didattica 1-5, non imposta dallo standard): punteggio = gravità × probabilità, su 25. Gravità 5 → priorità ALTA sempre (impatto molto grave o irreversibile, anche se poco probabile); punteggio da 12 in su → priorità alta (azione immediata, responsabile e scadenza); da 6 a 11 → priorità media (azione pianificata e monitoraggio); sotto 6 → priorità bassa (tenere sotto controllo). Esempio suggerito: gravità 5 e probabilità 1, come un infortunio mortale o il lavoro minorile: la priorità resta alta.",
  young: "Calcolatore del committente sulla giornata di Marco, 16 anni (D1.3): non conforme se le ore di lavoro superano 8, se scuola + lavoro + trasporto superano 10 ore, se c'è lavoro notturno. Esempio di partenza: 4 ore di scuola, 5 di lavoro, 1,5 di trasporto, niente notte = 10,5 ore complessive, NON conforme sul totale. Esempio suggerito: 4 di scuola, 6 di lavoro, 1 di trasporto = 11 ore: lavoro sotto le 8 ore ma totale oltre 10, non conforme.",
  week: "Calcolatore del committente sulla settimana (D4): non conforme se l'orario ordinario supera 48 ore, se lo straordinario supera 12 ore, se si lavora più di 6 giorni di seguito (manca il riposo di 24 ore), se lo straordinario non è volontario. Caso A: 40 ordinarie + 8 straordinario volontario, 5 giorni → conforme (48 ore totali). Caso B: 48 + 16 straordinario, 6 giorni → non conforme (straordinario oltre 12). Caso C: 44 + 10, 7 giorni di seguito, straordinario non volontario → non conforme (manca il riposo e lo straordinario è imposto). Anche quando è conforme lo straordinario va pagato con maggiorazione e non deve diventare abituale.",
};

function attivita(s) {
  const r = [];
  if (s.k === "flip") s.cards.forEach((c) => r.push(`- ${c[0]}: ${testo(c[1])}`));
  if (s.k === "sc") s.opts.forEach((o) => r.push(`- ${testo(o[0])}${o[1] ? " → CORRETTA" : " → errata"}. ${testo(o[2])}`));
  if (s.k === "tf") s.items.forEach((it) => r.push(`- «${testo(it[0])}» → ${it[1] ? "VERO" : "FALSO"}. ${testo(it[2])}`));
  if (s.k === "cls") { r.push(`Categorie: ${s.cats.join(" · ")}`); s.items.forEach((it) => r.push(`- ${testo(it[0])} → ${s.cats[it[1]]}${it[2] ? `. ${testo(it[2])}` : ""}`)); }
  if (s.k === "ord") { r.push("Ordine corretto:"); s.items.forEach((t, i) => r.push(`${i + 1}. ${testo(t)}`)); }
  if (s.k === "tl") s.steps.forEach((st) => r.push(`- ${st[0]}: ${testo(st[1])}`));
  if (s.k === "todo") s.items.forEach((t) => r.push(`- ${testo(t)}`));
  if (s.k === "calc") r.push(CALC[s.calc]);
  const nome = { flip: "carte da girare", sc: "caso con scelta", tf: "vero o falso", cls: "classificazione", ord: "ordinamento", tl: "linea del tempo", todo: "lista di azioni", calc: `calcolatore «${s.calc}»` }[s.k];
  return nome ? `[ATTIVITÀ DEL COMMITTENTE — ${nome}]\n${r.join("\n")}` : "";
}

const note = existsSync(`produzione/${corso}/_fonte-note.json`)
  ? JSON.parse(readFileSync(`produzione/${corso}/_fonte-note.json`, "utf8")) : {};
const checkpoint = [];
let esame = [];
C.forEach((m, i) => {
  const mod = `m${String(i + 1).padStart(2, "0")}`;
  const titolo = m.t.replace(/^Modulo \d+ · /, "");
  let txt = `# UNITÀ ${i + 1} — ${titolo} (1 ora)\n\n`;
  const nota = [note.tutti, note[mod]].filter(Boolean).join("\n\n");
  if (nota) txt += `NOTA DI PRODUZIONE (da rispettare, non da dire in voce): ${nota}\n\n`;
  let k = 0, sez = 0;
  for (const s of m.s) {
    if (s.k === "quiz") {
      const dom = s.qs.map((q) => ({ modulo: s.exam ? null : mod, domanda: testo(q[0]), opzioni: q[1].map(testo), corretta: q[2] }));
      if (s.exam) esame = dom; else for (const d of dom) checkpoint.push({ ...d, fonte: "test" });
      continue;
    }
    if (s.k === "cert") continue;
    txt += `## SEZIONE ${++sez} — ${testo(s.t)}\n\n`;
    const bl = blocchi(s.t, s.h);
    const att = attivita(s);
    if (!bl.length) bl.push({ titolo: s.t, corpo: "" });
    bl.forEach((b, j) => {
      txt += `### SCHERMATA ${++k} — ${b.titolo} [slide ${sez}]\n${b.corpo}${j === bl.length - 1 && att ? `${b.corpo ? "\n" : ""}${att}` : ""}\n\n`;
    });
  }
  if (note.legge?.[mod]) txt += `## RIFERIMENTO DI LEGGE VIGENTE (testo ufficiale SA8000:2026 e cronologia SAI — per la verifica dei riferimenti, NON una sezione da narrare né da leggere)

${note.legge[mod].trim()}
`;
  if (/\$\{|=>|function\(/.test(txt.split("## RIFERIMENTO DI LEGGE")[0])) throw new Error(`${mod}: resta codice non renderizzato`);
  writeFileSync(`${out}/${mod}.txt`, txt);
  console.log(`${mod}: ${titolo} · ${sez} sezioni · ${k} schermate · ${txt.split("## RIFERIMENTO DI LEGGE")[0].split(/\s+/).length} parole`);
});
writeFileSync(`${out}/quiz.json`, JSON.stringify({
  parametri: { ore: 4, test: "8 domande, soglia 75%", esame: "12 domande, soglia 75%" },
  checkpoint, esame,
}, null, 2) + "\n");
console.log(`test ${checkpoint.length} · domande d'esame ${esame.length} (modulo da assegnare a mano)`);
