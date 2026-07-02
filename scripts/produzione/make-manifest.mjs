// Costruisce produzione/<corso>/manifest.json (formato courseManifestSchema) dai copioni,
// con slide HTML PROVVISORIE (titolo + punti dagli speakerNotes). Le slide definitive
// arriveranno dal track design: si rigenera il manifest con quell'HTML e si re-ingesta.
// clipKey = ID canonico (barriera anti-mescolamento #1). Quiz mappati dal copioni.checkpoint.
//
// Uso: node scripts/produzione/make-manifest.mjs <corso> --required-min <minuti> [--title "..."]

import { dirs, readJson, writeJson, slideIds } from "./lib.mjs";

const corso = process.argv[2];
const reqIx = process.argv.indexOf("--required-min");
const titleIx = process.argv.indexOf("--title");
if (!corso || reqIx === -1) {
  console.error('Uso: node scripts/produzione/make-manifest.mjs <corso> --required-min <minuti> [--title "..."]');
  process.exit(2);
}
const requiredMinutes = Number(process.argv[reqIx + 1]);

const d = dirs(corso);
const copioni = readJson(d.copioni);
slideIds(copioni); // valida gli ID

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

// domande copioni ({domanda,opzioni,corretta,spiegazione}) -> formato canonico quiz
function toQuestions(bank) {
  return bank.map((q) => ({
    text: q.domanda,
    options: q.opzioni.map((text, i) => ({ id: String.fromCharCode(97 + i), text })),
    correctOptionId: String.fromCharCode(97 + q.corretta),
  }));
}

// raggruppa le slide per modulo (dall'ID: <corso>_mNN_sNNN)
const byModule = new Map();
for (const s of copioni.slides) {
  const m = s.id.match(/_m(\d{2})_/)[1];
  if (!byModule.has(m)) byModule.set(m, []);
  byModule.get(m).push(s);
}

const checkpoint = copioni.checkpoint;
const modules = [...byModule.entries()].map(([num, slides]) => ({
  title: `Modulo ${Number(num)}`,
  lessons: [
    {
      title: `Modulo ${Number(num)} — Lezione`,
      slides: slides.map((s) => ({
        title: s.titolo,
        html: provisionalHtml(s),
        clipKey: s.id,
        speakerNotes: s.speakerNotes,
      })),
      ...(checkpoint && checkpoint.modulo === `m${num}`
        ? {
            checkpointQuiz: {
              title: `Checkpoint Modulo ${Number(num)}`,
              questionsToDraw: checkpoint.questionsToDraw,
              passThreshold: checkpoint.passThreshold,
              timeLimitSeconds: 300,
              cooldownSeconds: 60,
              questions: toQuestions(checkpoint.questions),
            },
          }
        : {}),
    },
  ],
}));

const manifest = {
  title: titleIx !== -1 ? process.argv[titleIx + 1] : copioni.titolo,
  requiredMinutes,
  modules,
};

writeJson(d.manifest, manifest);
const nSlides = copioni.slides.length;
console.log(`OK · ${d.manifest}: ${modules.length} moduli, ${nSlides} slide, requiredMinutes=${requiredMinutes}`);
