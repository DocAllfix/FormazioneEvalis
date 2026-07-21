// Costruisce produzione/<corso>/manifest.json (formato courseManifestSchema) dai copioni.
// Slide HTML: definitive da --slides-dir <dir> (un <id>.html per slide, dal track design),
// altrimenti PROVVISORIE (titolo + punti dagli speakerNotes) per il collaudo tecnico.
// clipKey = ID canonico (barriera anti-mescolamento #1).
// Quiz dallo schema REALE dei copioni (era fabbrica v3):
//   checkpoint = mappa { mNN: { estrazione, soglia (0-1), banca[{q, opzioni[], corretta, slide, tipo}] } }
//   esameFinale = { estrazione, soglia, banca[{..., modulo}] }
// -> quizInputSchema piattaforma: { questionsToDraw, passThreshold (1-100), questions[{text,
//    options[{id,text}], correctOptionId}], timeLimitSeconds, cooldownSeconds }.
// requiredMinutes = budget.minutiLegali dei copioni (override con --required-min).
//
// Uso: node scripts/produzione/make-manifest.mjs <corso> [--slides-dir <dir>] [--required-min <minuti>]
//      [--title "..."] [--checkpoint-time 600] [--exam-time 3600]

import fs from "node:fs";
import path from "node:path";
import { dirs, readJson, writeJson, slideIds } from "./lib.mjs";

const corso = process.argv[2];
if (!corso) {
  console.error('Uso: node scripts/produzione/make-manifest.mjs <corso> [--slides-dir <dir>] [--required-min <min>] [--title "..."]');
  process.exit(2);
}
const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
};

const d = dirs(corso);
const copioni = readJson(d.copioni);
slideIds(copioni, corso); // valida gli ID (formato, unicità, appartenenza al corso)

const requiredMinutes = Number(argOf("--required-min") ?? copioni.budget?.minutiLegali);
if (!Number.isInteger(requiredMinutes) || requiredMinutes <= 0) {
  console.error(`requiredMinutes non valido (${requiredMinutes}): manca budget.minutiLegali nei copioni e --required-min`);
  process.exit(1);
}
const checkpointTime = Number(argOf("--checkpoint-time") ?? 600);
const examTime = Number(argOf("--exam-time") ?? 3600);
const slidesDir = argOf("--slides-dir");

function provisionalHtml(slide) {
  const punti = (slide.speakerNotes ?? "")
    .split(/[;·]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => `<li>${p}</li>`)
    .join("");
  return `<section style="font-family:Lexend,sans-serif;background:#FFF7ED;color:#1C1917;padding:48px;height:100%;box-sizing:border-box">
  <h1 style="color:#EA580C;font-size:2.2rem;margin:0 0 24px">${slide.titolo}</h1>
  <ul style="font-size:1.25rem;line-height:1.8">${punti}</ul>
  <p style="position:absolute;bottom:16px;right:24px;color:#A8A29E;font-size:.8rem">${slide.id} · slide provvisoria</p>
</section>`;
}

// SOLO la <section> (come il corso demo): l'HTML importato è un documento intero con
// <body> che ha un suo background — se lo salviamo com'è, il player prende quel background
// (es. #E7DECD) e tinge il gutter di un colore diverso dalla slide. Estraendo la section,
// il primo (e unico) background è quello vero della slide.
function sectionOnly(full, id) {
  const m = full.match(/<section\b[\s\S]*<\/section>/i);
  if (!m) throw new Error(`nessuna <section> in ${id}.html`);
  return m[0];
}
function htmlFor(slide) {
  if (!slidesDir) return provisionalHtml(slide);
  const f = path.join(slidesDir, `${slide.id}.html`);
  if (!fs.existsSync(f)) throw new Error(`slide HTML definitiva mancante: ${f}`);
  return sectionOnly(fs.readFileSync(f, "utf8"), slide.id);
}

// banca copioni [{q, opzioni[], corretta}] -> formato canonico piattaforma
function toQuestions(banca) {
  return banca.map((q) => ({
    text: q.q,
    options: q.opzioni.map((text, i) => ({ id: String.fromCharCode(97 + i), text })),
    correctOptionId: String.fromCharCode(97 + q.corretta),
  }));
}

function toQuiz(quiz, title, timeLimitSeconds, cooldownSeconds) {
  return {
    title,
    questionsToDraw: quiz.estrazione,
    passThreshold: Math.round(quiz.soglia * 100),
    timeLimitSeconds,
    cooldownSeconds,
    questions: toQuestions(quiz.banca),
  };
}

// raggruppa le slide per modulo (dall'ID: <corso>_mNN_sNNN)
const byModule = new Map();
for (const s of copioni.slides) {
  const m = s.id.match(/_m(\d{2})_/)[1];
  if (!byModule.has(m)) byModule.set(m, []);
  byModule.get(m).push(s);
}

const checkpoint = copioni.checkpoint ?? {};
const senzaCheckpoint = [...byModule.keys()].filter((num) => !checkpoint[`m${num}`]);
if (senzaCheckpoint.length) {
  console.error(`ERRORE: moduli SENZA checkpoint nei copioni: ${senzaCheckpoint.map((n) => `m${n}`).join(", ")}`);
  process.exit(1);
}

const modules = [...byModule.entries()].map(([num, slides]) => ({
  title: `Modulo ${Number(num)}`,
  lessons: [
    {
      title: `Modulo ${Number(num)} — Lezione`,
      slides: slides.map((s) => ({
        title: s.titolo,
        html: htmlFor(s),
        clipKey: s.id,
        speakerNotes: s.speakerNotes,
      })),
      checkpointQuiz: toQuiz(checkpoint[`m${num}`], `Checkpoint Modulo ${Number(num)}`, checkpointTime, 60),
    },
  ],
}));

if (!copioni.esameFinale?.banca?.length) {
  console.error("ERRORE: esameFinale mancante o senza banca nei copioni");
  process.exit(1);
}

const manifest = {
  title: argOf("--title") ?? copioni.titolo,
  requiredMinutes,
  modules,
  finalExam: toQuiz(copioni.esameFinale, "Esame finale", examTime, 3600),
};

writeJson(d.manifest, manifest);
const nQ = Object.values(checkpoint).reduce((a, c) => a + c.banca.length, 0);
console.log(
  `OK · ${d.manifest}: ${modules.length} moduli, ${copioni.slides.length} slide ` +
  `(${slidesDir ? "HTML DEFINITIVE da " + slidesDir : "HTML PROVVISORIE"}), ` +
  `${modules.length} checkpoint (${nQ} domande in banca), esame ${copioni.esameFinale.banca.length} domande ` +
  `(estrae ${copioni.esameFinale.estrazione}, soglia ${Math.round(copioni.esameFinale.soglia * 100)}%), ` +
  `requiredMinutes=${requiredMinutes}`,
);
