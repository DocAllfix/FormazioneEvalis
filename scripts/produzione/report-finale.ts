// REPORT FINALE DI PRODUZIONE — un solo file per corso con TUTTO, slide per slide.
// Unisce ciò che sta nel DB (verità della piattaforma) con gli esiti dei controlli già
// eseguiti: gate impaginazione, giudice di contestualità, QA audio, passata Playwright.
// Sola lettura: non modifica nulla.
//
// Uso: npx tsx scripts/produzione/report-finale.ts <corso> [<corso> …]
// Esito: produzione/<corso>/REPORT-FINALE.md  +  REPORT-FINALE.json
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, module as moduleT, lesson, slide, quiz, quizQuestion } from "@/lib/db/schema";

const corsi = process.argv.slice(2);
if (!corsi.length) { console.error("Uso: report-finale.ts <corso> [<corso> …]"); process.exit(2); }

const leggi = (p: string) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
const min = (s: number) => `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

for (const corso of corsi) {
  const dir = path.join("produzione", corso);
  const copioni = leggi(path.join(dir, "copioni.json"));
  const audioMap = leggi(path.join(dir, "audio-map.json")) ?? {};
  const clipMap = leggi(path.join(dir, "clip-map.json")) ?? {};
  const riuso = leggi(path.join(dir, "riuso-clip.json"));
  const gate = leggi(path.join("produzione", "_staging", "slide-gates", corso, "report.json"))?.slide ?? {};
  const ctx = leggi(path.join("produzione", "_staging", "slide-gates", corso, "contestualita.json"))?.slide ?? {};
  // passata Playwright: gli esiti arrivano indicizzati per clip (e per titolo, per le statiche),
  // perché in banca dati la slide ha un UUID e non l'ID canonico dei copioni.
  const pw = leggi(path.join("produzione", "_qa-playwright", `${corso}.json`)) ?? { perUid: {}, perTitolo: {} };
  const qaAudio = leggi(path.join(dir, "qa-report.json"))?.audio ?? {};
  const rispQuiz = leggi(path.join("produzione", "_staging", "slide-gates", corso, "risposte-quiz.json"));
  const manifest = leggi(path.join(dir, "manifest.json"));
  // eccezioni già esaminate a mano (falsi positivi dei giudici, con la motivazione):
  // senza questa sezione un "1 fallimento" nel riepilogo sembra un difetto ancora aperto.
  const eccezioniPath = path.join(dir, "eccezioni-qa.md");
  const eccezioni = fs.existsSync(eccezioniPath) ? fs.readFileSync(eccezioniPath, "utf8") : "";
  const titolo = copioni?.titolo ?? corso;
  const riusate = new Set<string>(riuso?.slide ?? []);

  // DB: il corso ingestato (slug o titolo)
  const righe = await db
    .select({
      slideId: slide.id, titolo: slide.title, ordine: slide.position, clip: slide.avatarClipUid,
      audio: slide.audioSeconds, lezione: lesson.title, modulo: moduleT.title,
      modOrd: moduleT.position, courseId: course.id, corsoTitolo: course.title,
      requiredMinutes: course.requiredMinutes, slug: course.slug,
    })
    .from(slide)
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(moduleT, eq(moduleT.id, lesson.moduleId))
    .innerJoin(course, eq(course.id, moduleT.courseId))
    .where(eq(course.slug, process.env[`SLUG_${corso}`] ?? corso))
    .orderBy(asc(moduleT.position), asc(slide.position));

  const inDb = righe.length > 0;
  // in banca dati la slide ha un id interno: il ponte con l'ID canonico è la clip
  // (clip-map: canonico -> uid) oppure, in mancanza, il titolo.
  const perUid = new Map<string, (typeof righe)[number]>();
  for (const r of righe) if (r.clip) perUid.set(r.clip, r);
  const perTitolo = new Map<string, (typeof righe)[number]>();
  for (const r of righe) perTitolo.set((r.titolo ?? "").trim().toLowerCase(), r);
  const perSlide = (copioni.slides as any[]).map((s: any) => {
    const uid = clipMap[s.id]?.uid;
    const db1 = (uid ? perUid.get(uid) : undefined) ?? perTitolo.get((s.titolo ?? "").trim().toLowerCase());
    const a = audioMap[s.id];
    const c = clipMap[s.id];
    const parole = s.testo.split(/\s+/).length;
    const durata = a?.duration ?? db1?.audio ?? null;
    return {
      id: s.id,
      titolo: s.titolo ?? "",
      parole,
      audioSecondi: durata,
      // velocità di lettura: smaschera una sintesi troncata o muta senza riascoltare nulla
      paroleAlMinuto: durata ? Math.round((parole / durata) * 60) : null,
      qaAudio: (qaAudio as any)[s.id]?.status ?? "—",
      lufs: (qaAudio as any)[s.id]?.lufs ?? null,
      origineAudio: riusate.has(s.id) ? "riuso edizione precedente" : "nuovo",
      clipUid: c?.uid ?? db1?.clip ?? null,
      clipDurata: c?.duration ?? null,
      inPiattaforma: Boolean(db1),
      gateImpaginazione: gate[s.id]?.esito ?? "—",
      altezzaPx: gate[s.id]?.height ?? null,
      contestualita: ctx[s.id]?.verdetto ?? "—",
      playwright: (uid ? pw.perUid?.[uid] : undefined)
        ?? pw.perTitolo?.[(s.titolo ?? "").trim().toLowerCase()] ?? "—",
    };
  });

  const senzaClip = perSlide.filter((x) => !x.clipUid);
  const senzaAudio = perSlide.filter((x) => !x.audioSecondi);
  const fuoriDb = inDb ? perSlide.filter((x) => !x.inPiattaforma) : [];
  const secondi = perSlide.reduce((t, x) => t + (x.audioSecondi ?? 0), 0);
  const legali = (copioni.budget?.minutiLegali ?? 0) * 60;

  // quiz dal DB (se ingestato) o dai copioni
  const quizDb = inDb
    ? await db.select({ id: quiz.id, tipo: quiz.type, titoloQuiz: quiz.title, estrazione: quiz.questionsToDraw, soglia: quiz.passThreshold })
        .from(quiz).where(eq(quiz.courseId, righe[0].courseId))
    : [];
  const banche = [] as { id: string; tipo: string; banca: number; estrazione: number; soglia: number }[];
  for (const q of quizDb) {
    const n = await db.select({ id: quizQuestion.id }).from(quizQuestion).where(eq(quizQuestion.quizId, q.id));
    banche.push({ id: q.titoloQuiz, tipo: String(q.tipo), banca: n.length, estrazione: q.estrazione, soglia: q.soglia });
  }
  // finché il corso non è in piattaforma le banche si leggono dal manifest, così il report
  // dice comunque quante domande ci sono, quante se ne estraggono e con che soglia.
  if (!banche.length && manifest) {
    manifest.modules.forEach((m: any, i: number) => {
      for (const l of m.lessons) {
        const q = l.checkpointQuiz;
        if (q) banche.push({ id: `checkpoint m${String(i + 1).padStart(2, "0")}`, tipo: "checkpoint",
                             banca: q.questions.length, estrazione: q.questionsToDraw, soglia: q.passThreshold });
      }
    });
    const fe = manifest.finalExam;
    if (fe) banche.push({ id: "esame finale", tipo: "final", banca: fe.questions.length,
                          estrazione: fe.questionsToDraw, soglia: fe.passThreshold });
  }

  const riepilogo = {
    corso, titolo, slide: perSlide.length,
    slideInPiattaforma: righe.length,
    audioTotale: secondi, monteOreLegale: legali,
    margine: legali ? `${(((secondi / legali) - 1) * 100).toFixed(1)}%` : "—",
    clipNuove: perSlide.filter((x) => x.origineAudio === "nuovo").length,
    clipRiusate: riusate.size,
    senzaClip: senzaClip.length, senzaAudio: senzaAudio.length, fuoriDb: fuoriDb.length,
    gateFail: perSlide.filter((x) => x.gateImpaginazione === "FAIL").length,
    contestualitaFail: perSlide.filter((x) => x.contestualita === "FAIL").length,
    playwrightFail: perSlide.filter((x) => String(x.playwright).startsWith("FAIL")).length,
    playwrightVerificate: perSlide.filter((x) => x.playwright !== "—").length,
    qaAudioFlagged: perSlide.filter((x) => x.qaAudio === "FLAGGED").length,
    qaAudioVerificate: perSlide.filter((x) => x.qaAudio !== "—").length,
    quiz: banche,
    risposteQuiz: rispQuiz ? { totale: rispQuiz.totale, disaccordi: rispQuiz.disaccordi } : null,
  };

  fs.writeFileSync(path.join(dir, "REPORT-FINALE.json"),
    JSON.stringify({ riepilogo, slide: perSlide }, null, 1), "utf8");

  const righeMd = perSlide.map((x) =>
    `| ${x.id} | ${x.titolo.slice(0, 44)} | ${x.parole} | ${x.audioSecondi ? min(x.audioSecondi) : "—"} | ${x.paroleAlMinuto ?? "—"} | ${x.origineAudio === "nuovo" ? "nuovo" : "riuso"} | ${x.clipUid ? x.clipUid.slice(0, 10) + "…" : "MANCA"} | ${x.inPiattaforma ? "sì" : "no"} | ${x.gateImpaginazione} | ${x.contestualita} | ${x.qaAudio}${x.lufs ? ` ${x.lufs}` : ""} | ${x.playwright} |`).join("\n");

  const md = `# Report finale di produzione — ${titolo}

Generato il ${new Date().toISOString().slice(0, 16).replace("T", " ")}.

## Riepilogo

| Voce | Valore |
|---|---|
| Slide totali | ${riepilogo.slide} |
| Slide presenti in piattaforma | ${riepilogo.slideInPiattaforma} |
| Clip nuove prodotte | ${riepilogo.clipNuove} |
| Clip riusate dall'edizione precedente | ${riepilogo.clipRiusate} |
| Audio totale | ${min(secondi)} (${(secondi / 60).toFixed(1)} min) |
| Monte ore legale | ${(legali / 60).toFixed(0)} min |
| Margine sul monte ore | ${riepilogo.margine} |
| Slide senza clip | ${riepilogo.senzaClip} |
| Slide senza audio | ${riepilogo.senzaAudio} |
| Fallimenti impaginazione | ${riepilogo.gateFail} |
| Fallimenti contestualità | ${riepilogo.contestualitaFail} |
| Slide provate in piattaforma (Playwright) | ${riepilogo.playwrightVerificate} |
| Fallimenti apertura in piattaforma | ${riepilogo.playwrightFail} |
| Clip audio passate al QA silenzi+volume | ${riepilogo.qaAudioVerificate} |
| Clip audio segnalate dal QA | ${riepilogo.qaAudioFlagged} |
${rispQuiz ? `| Risposte quiz in disaccordo col giudice | ${rispQuiz.disaccordi} su ${rispQuiz.totale} |` : ""}

## Quiz

${banche.map((b) => `- ${b.id}: banca ${b.banca} domande, ne estrae ${b.estrazione}, soglia ${b.soglia}%`).join("\n")}
${rispQuiz ? `\nChiave di correzione verificata da un giudice indipendente: ${rispQuiz.totale - rispQuiz.disaccordi}/${rispQuiz.totale} concordi.` : ""}
${eccezioni ? `\n${eccezioni}` : ""}
## Slide, una per una

| ID | Titolo | Parole | Audio | Parole/min | Origine | Clip | In piattaforma | Impaginazione | Contestualità | QA audio (LUFS) | Apertura |
|---|---|---|---|---|---|---|---|---|---|---|---|
${righeMd}
`;
  fs.writeFileSync(path.join(dir, "REPORT-FINALE.md"), md, "utf8");
  console.log(`${corso}: REPORT-FINALE.md e .json scritti · ${riepilogo.slide} slide · clip mancanti ${riepilogo.senzaClip} · audio ${(secondi / 60).toFixed(1)} min`);
}
process.exit(0);
