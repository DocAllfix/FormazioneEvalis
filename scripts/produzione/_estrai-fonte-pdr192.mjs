// Estrae il contenuto didattico del corso FAD-PDR192-01 (HTML del committente: MODS = [{ t, h, obj, s: [...], q }],
// FINAL, KPIS) nel formato della fabbrica:
//   _fonte/<mNN>.txt   una SEZIONE per slide del committente, con le attività (checkpoint a scelta, abbinamento,
//                      calcolo, simulatore) scritte con soluzione e spiegazione;
//   _fonte/quiz.json   checkpoint (domande a scelta dei checkpoint + test di fine modulo) ed esame finale;
//   _fonte/attivita.json  per ogni attività: modulo, numero di sezione, tipo e dati (servono a costruire le slide
//                      interattive «Prova tu» sulla slide nostra che corrisponde alla sezione).
// Non si estraggono: la presentazione del player («Come funziona»), l'avanzamento salvato sul dispositivo, la
// pagina dell'attestato (sulla piattaforma il percorso è un altro).
// Note di produzione e testo ufficiale per modulo da produzione/<corso>/_fonte-note.json ({ tutti, mNN, legge:{mNN} }).
// Uso: node scripts/produzione/_estrai-fonte-pdr192.mjs <file.html> <corso>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import vm from "node:vm";

const [file, corso] = process.argv.slice(2);
if (!file || !corso) { console.error("Uso: _estrai-fonte-pdr192.mjs <file.html> <corso>"); process.exit(2); }
const out = `produzione/${corso}/_fonte`;
mkdirSync(out, { recursive: true });

const html = readFileSync(file, "utf8");
const codice = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
const corpo = codice.slice(0, codice.indexOf("/* ================= MOTORE"));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${corpo.replace(/^\s*"use strict";/, "")}\n;globalThis.__C = { MODS, FINAL, KPIS };`, ctx, { timeout: 10000 });
const { MODS, FINAL, KPIS } = ctx.__C;

const testo = (h) => String(h ?? "")
  .replace(/<\/(p|div|li|h[1-6]|tr|ol|ul)>/g, "\n")
  .replace(/<\/t[dh]>/g, " | ")
  .replace(/<br\s*\/?>/g, "\n")
  .replace(/<b>([^<]*)<\/b>(?=\S)/g, "$1 ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/[ \t]+/g, " ").replace(/ \)/g, ")").replace(/\( /g, "(").replace(/ ([,.;:])(?=\s|$)/gm, "$1")
  .split("\n").map((r) => r.trim().replace(/\s*\|\s*$/, "")).filter(Boolean).join("\n");

const lettera = (i) => "ABCDEFGH"[i];
const AREE = ["Organizzazione del lavoro e flessibilità", "Supporto alla maternità", "Supporto alla genitorialità", "Supporto agli impegni di cura", "Salute e benessere", "Sostegno economico e servizi per le famiglie", "Sviluppo professionale e continuità di carriera"];
const SIM = () => {
  const r = ["Simulatore del committente: si sceglie la fascia, si spuntano gli indicatori soddisfatti e il simulatore calcola punti, percentuale e verifica delle due condizioni (punteggio minimo e numero minimo di indicatori quantitativi).",
    "Indicatori (quantitativo = 1 punto con la sua soglia; qualitativo = 0,75 punti, Sì/No):"];
  KPIS.forEach((k) => r.push(`- Area ${k.a + 1} (${AREE[k.a]}): ${k.n} → ${k.q ? `quantitativo, ${Array.isArray(k.th) ? `soglie per fascia 1/2/3/4: ${k.th.join(" · ")}` : k.th}` : "qualitativo"}`));
  r.push("Caso studio Conserve Alifane (fascia 3): situazione iniziale 6,75 punti (29,0%, 3 quantitativi); dopo il piano 15,75 punti (67,7%, 6 quantitativi): accesso alla certificazione possibile.");
  return r.join("\n");
};

const note = existsSync(`produzione/${corso}/_fonte-note.json`)
  ? JSON.parse(readFileSync(`produzione/${corso}/_fonte-note.json`, "utf8")) : {};
const checkpoint = [];
const attivita = [];
let nCk = 0;
MODS.forEach((M, i) => {
  const mod = `m${String(i + 1).padStart(2, "0")}`;
  let txt = `# UNITÀ ${i + 1} — ${M.t} (${M.h})\n\nOBIETTIVI DEL MODULO (dal committente): ${M.obj}\n\n`;
  const nota = [note.tutti, note[mod]].filter(Boolean).join("\n\n");
  if (nota) txt += `NOTA DI PRODUZIONE (da rispettare, non da dire in voce): ${nota}\n\n`;
  M.s.forEach((s, j) => {
    const sez = j + 1;
    txt += `## SEZIONE ${sez} — ${testo(s.t)}\n\n### SCHERMATA ${sez} — ${testo(s.t)} [slide ${sez}${s.k ? ` · ${s.k}` : ""}]\n`;
    if (s.h) txt += testo(s.h) + "\n";
    if (s.c) {
      nCk++;
      txt += `[ATTIVITÀ DEL COMMITTENTE — checkpoint a scelta singola]\nDomanda: ${testo(s.c.q)}\n` +
        s.c.o.map((o, k) => `${lettera(k)}) ${testo(o)}${k === s.c.a ? " → CORRETTA" : ""}`).join("\n") + `\nSpiegazione: ${testo(s.c.f)}\n`;
      checkpoint.push({ modulo: mod, domanda: testo(s.c.q), opzioni: s.c.o.map(testo), corretta: s.c.a, fonte: "checkpoint" });
      attivita.push({ modulo: mod, sezione: sez, tipo: "scelta", titolo: testo(s.t), dati: s.c });
    }
    if (s.cl) {
      nCk++;
      txt += `[ATTIVITÀ DEL COMMITTENTE — checkpoint di abbinamento]\nConsegna: ${testo(s.cl.q)}\nCategorie: ${s.cl.cats.join(" · ")}\n` +
        s.cl.items.map((it) => `- ${testo(it[0])} → ${s.cl.cats[it[1]]}`).join("\n") + `\nSpiegazione: ${testo(s.cl.f)}\n`;
      attivita.push({ modulo: mod, sezione: sez, tipo: "abbina", titolo: testo(s.t), dati: s.cl });
    }
    if (s.n) {
      nCk++;
      txt += `[ATTIVITÀ DEL COMMITTENTE — checkpoint di calcolo]\nDomanda: ${testo(s.n.q)}\nRisultato: ${String(s.n.a).replace(".", ",")} ${s.n.u ?? ""}\nSpiegazione: ${testo(s.n.f)}\n`;
      attivita.push({ modulo: mod, sezione: sez, tipo: "calcolo", titolo: testo(s.t), dati: s.n });
    }
    if (s.sim) {
      txt += `[ATTIVITÀ DEL COMMITTENTE — simulatore di punteggio]\n${SIM()}\n`;
      attivita.push({ modulo: mod, sezione: sez, tipo: "simulatore", titolo: testo(s.t) });
    }
    txt += "\n";
  });
  if (note.legge?.[mod]) txt += `## RIFERIMENTO DI LEGGE VIGENTE (testo ufficiale UNI/PdR 192:2026 e fonti ufficiali sugli incentivi — per la verifica dei riferimenti, NON una sezione da narrare né da leggere)\n\n${note.legge[mod].trim()}\n`;
  if (/\$\{|=>|function\(/.test(txt.split("## RIFERIMENTO DI LEGGE")[0])) throw new Error(`${mod}: resta codice non renderizzato`);
  writeFileSync(`${out}/${mod}.txt`, txt);
  for (const q of M.q) checkpoint.push({ modulo: mod, domanda: testo(q.q), opzioni: q.o.map(testo), corretta: q.a, fonte: "test" });
  console.log(`${mod}: ${M.t} · ${M.s.length} sezioni · ${txt.split("## RIFERIMENTO DI LEGGE")[0].split(/\s+/).length} parole`);
});
// esame: il modulo di ogni domanda si assegna a mano (_fonte/esame-moduli.json: array di mNN, uno per domanda)
const mm = existsSync(`produzione/${corso}/_fonte/esame-moduli.json`) ? JSON.parse(readFileSync(`produzione/${corso}/_fonte/esame-moduli.json`, "utf8")) : [];
const esame = FINAL.map((q, i) => ({ modulo: mm[i] ?? null, domanda: testo(q.q), opzioni: q.o.map(testo), corretta: q.a }));
writeFileSync(`${out}/quiz.json`, JSON.stringify({
  parametri: { ore: 8, test: "10 domande per modulo, soglia 75%", esame: "15 domande, soglia 75%" },
  checkpoint, esame,
}, null, 2) + "\n");
writeFileSync(`${out}/attivita.json`, JSON.stringify(attivita, null, 2) + "\n");
console.log(`checkpoint del committente ${nCk} · domande in banca ${checkpoint.length} · esame ${esame.length}${mm.length ? "" : " (moduli d'esame da assegnare)"}`);
