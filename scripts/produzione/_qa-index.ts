// Genera produzione/_qa-playwright/index.html: cruscotto notturno con il riepilogo verificato
// e i link ai contact sheet per corso + audit quiz. Legge i numeri da _run.log e _quiz-audit.txt.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const DIR = "produzione/_qa-playwright";
const runLog = fs.readFileSync(path.join(DIR, "_run.log"), "utf8");
const rows = [...runLog.matchAll(/^([0-9a-z]+): OK (\d+)\/(\d+)(?: · FAIL (\d+))?/gm)]
  .map((m) => ({ corso: m[1], ok: +m[2], tot: +m[3], fail: m[4] ? +m[4] : 0 }));
const totFail = (runLog.match(/FINE\. FAIL totali: (\d+)/) ?? [])[1] ?? "?";
const quiz = fs.existsSync(path.join(DIR, "_quiz-audit.txt")) ? fs.readFileSync(path.join(DIR, "_quiz-audit.txt"), "utf8") : "";
const quizLine = (quiz.match(/=== QUIZ:.*===/) ?? ["(audit quiz non trovato)"])[0];

const cards = rows.map((r) => {
  const bad = r.fail > 0;
  return `<a class="card ${bad ? "bad" : "ok"}" href="${r.corso}.html">
    <div class="corso">${r.corso}</div>
    <div class="num">${r.ok}/${r.tot}</div>
    <div class="tag">${bad ? `✗ ${r.fail} FAIL` : "✓ tutte OK"}</div></a>`;
}).join("");

const html = `<!doctype html><meta charset=utf-8><title>QA notturno — Evalis Academy</title>
<style>
 body{background:#0b0b0c;color:#eee;font:15px/1.5 system-ui,sans-serif;margin:0;padding:28px}
 h1{font-size:22px;margin:0 0 4px}.sub{color:#9a9a9a;margin:0 0 20px}
 .banner{padding:14px 18px;border-radius:12px;margin:0 0 22px;font-weight:600}
 .green{background:#0f2e17;color:#7ee2a0;border:1px solid #1c5c30}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
 .card{display:block;text-decoration:none;color:inherit;background:#161618;border:1px solid #2a2a2e;border-radius:12px;padding:16px;transition:.15s}
 .card:hover{border-color:#555;transform:translateY(-2px)}
 .card.ok{border-left:4px solid #2ecc71}.card.bad{border-left:4px solid #e74c3c}
 .corso{font-size:13px;color:#bbb}.num{font-size:26px;font-weight:700;margin:4px 0}.tag{font-size:12px;color:#8a8a8a}
 .foot{margin-top:26px;color:#8a8a8a;font-size:13px}code{color:#cdd}
</style>
<h1>QA notturno — catalogo Evalis Academy</h1>
<p class="sub">Passata Playwright PROFONDA in produzione · ${new Date().toLocaleString("it-IT")}</p>
<div class="banner green">✓ Slide: FAIL totali = ${totFail}. &nbsp;·&nbsp; ${quizLine.replace(/=== | ===/g, "")}</div>
<div class="grid">${cards}</div>
<p class="foot">Ogni clip verificata: <b>parte</b> · <b>regge ≥2,4s</b> · <b>ha audio in decodifica</b> · <b>durata valida</b> · <b>3 fotogrammi</b> (inizio 10% / metà 50% / fine 90%).
Nel contact sheet la miniatura è il frame 50%; <code>NNN_ini.png</code>/<code>NNN_fin.png</code> sul disco per lo spot-check.
Limite onesto: la macchina certifica caricamento+riproduzione+audio-presente+dati-quiz; le <i>parole esatte</i> e il <i>lip-sync</i> restano al giudizio umano su campione (audio già validato a monte: hash PCM==sorgente).</p>`;

fs.writeFileSync(path.join(DIR, "index.html"), html);
console.log(`index.html scritto (${rows.length} corsi, FAIL totali ${totFail})`);
process.exit(0);
