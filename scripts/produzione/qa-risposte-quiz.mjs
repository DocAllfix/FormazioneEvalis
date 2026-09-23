// QA RISPOSTE QUIZ — un giudice indipendente risponde a ogni domanda del manifest SENZA
// sapere quale opzione è marcata corretta, e si segnala dove non concorda. Serve a scoprire
// la chiave di correzione sbagliata: una domanda con la risposta giusta marcata male fa
// bocciare chi ha studiato, e in un corso che rilascia attestati è un danno serio.
// Il giudice vede la NARRAZIONE del modulo, così giudica secondo il corso e non a naso.
// Non modifica nulla: scrive solo il rapporto.
//
// Uso: node --env-file=.env scripts/produzione/qa-risposte-quiz.mjs <corso> [<corso> ...]
// Output: produzione/_staging/slide-gates/<corso>/risposte-quiz.json
import fs from "node:fs";
import path from "node:path";

const corsi = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deploy = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT;
if (!corsi.length || !endpoint || !apiKey || !deploy) {
  console.error("Uso: node --env-file=.env scripts/produzione/qa-risposte-quiz.mjs <corso> [...]");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SYS =
  "Sei un auditor esperto di sistemi di gestione ISO. Ti viene data una domanda a risposta multipla " +
  "tratta da un corso di formazione, insieme a un estratto del materiale didattico. " +
  "Scegli l'opzione corretta SECONDO IL MATERIALE. Se più opzioni sembrano difendibili, scegli la " +
  "migliore e dillo. Rispondi SOLO con JSON: " +
  '{"scelta":"a|b|c|d","sicurezza":1-5,"perche":"una riga"}.';

async function chiedi(user) {
  const body = { model: deploy, temperature: 0, response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYS }, { role: "user", content: user }] };
  for (let i = 0; i < 6; i++) {
    try {
      const r = await fetch(`${endpoint.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", connection: "close" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        if (/rate limit|429|50[234]/i.test(t) && i < 5) { await sleep(400 * 2 ** i + Math.random() * 300); continue; }
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

for (const corso of corsi) {
  const manifest = JSON.parse(fs.readFileSync(`produzione/${corso}/manifest.json`, "utf8"));
  const copioni = JSON.parse(fs.readFileSync(`produzione/${corso}/copioni.json`, "utf8"));
  // materiale per modulo: la narrazione delle slide di quel modulo, tagliata a misura di prompt
  const perModulo = new Map();
  for (const s of copioni.slides) {
    const m = s.id.match(/_(m\d\d)_/)?.[1];
    if (!m) continue;
    perModulo.set(m, (perModulo.get(m) || "") + " " + (s.testo || ""));
  }

  const domande = [];
  manifest.modules.forEach((mod, i) => {
    const m = `m${String(i + 1).padStart(2, "0")}`;
    for (const l of mod.lessons)
      for (const q of l.checkpointQuiz?.questions || []) domande.push({ dove: `checkpoint ${m}`, materiale: m, q });
  });
  for (const q of manifest.finalExam.questions) domande.push({ dove: "esame finale", materiale: null, q });

  const risultati = [];
  let disaccordi = 0;
  for (let i = 0; i < domande.length; i += 8) {
    const blocco = domande.slice(i, i + 8);
    const esiti = await Promise.all(blocco.map(async ({ dove, materiale, q }) => {
      const mat = materiale ? perModulo.get(materiale) || "" : [...perModulo.values()].join(" ");
      const user =
        `MATERIALE DIDATTICO (estratto):\n${mat.slice(0, 14000)}\n\n` +
        `DOMANDA: ${q.text}\n` + q.options.map((o) => `${o.id}) ${o.text}`).join("\n") +
        `\n\nRispondi SOLO JSON.`;
      const r = await chiedi(user);
      const concorda = r.scelta === q.correctOptionId;
      return { dove, testo: q.text, marcata: q.correctOptionId, scelta: r.scelta,
               sicurezza: r.sicurezza, perche: r.perche, concorda };
    }));
    for (const e of esiti) { risultati.push(e); if (!e.concorda) disaccordi++; }
    process.stdout.write(`\r${corso}: ${risultati.length}/${domande.length} · disaccordi ${disaccordi}   `);
  }
  const outDir = path.join("produzione", "_staging", "slide-gates", corso);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "risposte-quiz.json"),
    JSON.stringify({ corso, totale: risultati.length, disaccordi, risultati }, null, 1), "utf8");
  console.log(`\n${corso}: ${risultati.length} domande · ${disaccordi} disaccordi → ${outDir}/risposte-quiz.json`);
  for (const r of risultati.filter((x) => !x.concorda))
    console.log(`  ${r.dove} · marcata ${r.marcata}, giudice ${r.scelta} (sicurezza ${r.sicurezza}): ${r.testo.slice(0, 70)}`);
}
