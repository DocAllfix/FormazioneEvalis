// Assembla e carica in piattaforma il corso DEMO ISO 14064-1 (Moduli 1+2):
// - estrae le slide #1..#14 (HTML impaginato) dal democorso,
// - associa a ciascuna la clip avatar (Cloudflare) e la durata da clip-map.json,
// - crea il checkpoint (Quiz intermedio 1) e l'esame finale,
// - ingesta il corso e lo assegna a un utente di test.
//
// Prerequisiti: `node scripts/upload-demo-clips.mjs` (genera democorso/clip-map.json)
//               e l'utente già registrato su /registrati.
// Uso: npx tsx scripts/build-demo-course.ts <email-utente-test>

import "dotenv/config";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, member, enrollment } from "@/lib/db/schema";
import { ingestCourse } from "@/features/courses/ingest";
import type { CourseInput, SlideInput, QuizInput } from "@/features/courses/course-format";

const email = process.argv[2];
if (!email) {
  console.error("Uso: npx tsx scripts/build-demo-course.ts <email-utente-test>");
  process.exit(1);
}

// --- clip map (uid + durata) ---
type Clip = { uid: string; duration: number };
const clipMap = JSON.parse(readFileSync("democorso/clip-map.json", "utf8")) as Record<string, Clip>;

// --- HTML sorgente: unescape + decodifica \uXXXX (i tag di chiusura sono /) ---
const FILE = "democorso/Corso interattivo ISO 14064-1 (standalone).html";
const src = readFileSync(FILE, "utf8")
  .replace(/\\"/g, '"')
  .replace(/\\n/g, "\n")
  .replace(/\\\//g, "/")
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const openRe = /<section\b[^>]*data-screen-label="(\d+)"[^>]*>/gi;
const marks: { label: number; start: number; tag: string }[] = [];
for (let m = openRe.exec(src); m; m = openRe.exec(src)) {
  marks.push({ label: Number(m[1]), start: m.index, tag: m[0] });
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

function sectionHtml(label: number): string {
  const i = marks.findIndex((x) => x.label === label);
  if (i === -1) throw new Error(`Slide #${label} non trovata nell'HTML`);
  const to = i + 1 < marks.length ? marks[i + 1].start : src.length;
  let chunk = src.slice(marks[i].start, to);
  const end = chunk.lastIndexOf("</section>");
  if (end !== -1) chunk = chunk.slice(0, end + "</section>".length);
  return chunk.trim();
}

function slideFor(n: number): SlideInput {
  const key = `s${String(n).padStart(2, "0")}`;
  const clip = clipMap[key];
  if (!clip) throw new Error(`Clip mancante per ${key} in clip-map.json`);
  const mark = marks.find((x) => x.label === n)!;
  return {
    title: attr(mark.tag, "data-label") ?? `Slide ${n}`,
    blocks: [{ type: "html", html: sectionHtml(n) }],
    avatarClipUid: clip.uid,
    audioSeconds: clip.duration,
    speakerNotes: attr(mark.tag, "data-speaker-notes"),
  };
}

// --- Banca domande (Quiz intermedio 1 del democorso) ---
const bank = [
  {
    text: "A quale livello si applica la UNI EN ISO 14064-1?",
    options: [
      { id: "a", text: "Prodotto" },
      { id: "b", text: "Progetto" },
      { id: "c", text: "Organizzazione" },
      { id: "d", text: "Nazione" },
    ],
    correctOptionId: "c",
  },
  {
    text: "Un processo che rimuove un GHG dall'atmosfera è un:",
    options: [
      { id: "a", text: "Sorgente" },
      { id: "b", text: "Assorbitore" },
      { id: "c", text: "Serbatoio" },
      { id: "d", text: "Fattore di emissione" },
    ],
    correctOptionId: "b",
  },
  {
    text: "Le emissioni dirette provengono da sorgenti:",
    options: [
      { id: "a", text: "Di terzi a monte" },
      { id: "b", text: "Possedute o controllate dall'organizzazione" },
      { id: "c", text: "Sempre escluse" },
      { id: "d", text: "Di sola energia importata" },
    ],
    correctOptionId: "b",
  },
  {
    text: "Quale principio impone di ridurre errori sistematici e incertezze?",
    options: [
      { id: "a", text: "Pertinenza" },
      { id: "b", text: "Completezza" },
      { id: "c", text: "Accuratezza" },
      { id: "d", text: "Trasparenza" },
    ],
    correctOptionId: "c",
  },
  {
    text: "Quale norma descrive la verifica e validazione delle dichiarazioni GHG?",
    options: [
      { id: "a", text: "ISO 14064-1" },
      { id: "b", text: "ISO 14064-2" },
      { id: "c", text: "ISO 14064-3" },
      { id: "d", text: "ISO 14067" },
    ],
    correctOptionId: "c",
  },
];

const checkpoint: QuizInput = {
  title: "Quiz intermedio 1",
  questionsToDraw: 3,
  passThreshold: 100,
  timeLimitSeconds: 180,
  cooldownSeconds: 0,
  questions: bank,
};

const finalExam: QuizInput = {
  title: "Esame finale — Moduli 1 e 2",
  questionsToDraw: 5,
  passThreshold: 80,
  timeLimitSeconds: 300,
  cooldownSeconds: 60,
  questions: bank,
};

const slides1 = [1, 2, 3, 4, 5, 6, 7, 8].map(slideFor);
const slides2 = [9, 10, 11, 12, 13, 14].map(slideFor);
const totalSeconds = [...slides1, ...slides2].reduce((a, s) => a + s.audioSeconds, 0);

const course: CourseInput = {
  title: "ISO 14064-1 — Quantificazione dei gas serra (demo Moduli 1-2)",
  description:
    "Corso demo con relatore avatar. Moduli 1 e 2: contesto, quadro normativo, termini e principi della ISO 14064-1.",
  requiredMinutes: Math.floor(totalSeconds / 60),
  modules: [
    {
      title: "ISO 14064-1 — Moduli 1 e 2",
      lessons: [
        { title: "Modulo 1 — Contesto e quadro normativo", type: "html", slides: slides1 },
        { title: "Modulo 2 — Termini e principi", type: "html", slides: slides2, checkpointQuiz: checkpoint },
      ],
    },
  ],
  finalExam,
};

// --- Ingest + assegnazione ---
const { courseId } = await ingestCourse(course);
console.log(`Corso ingestato: ${courseId} · ${slides1.length + slides2.length} slide · ${totalSeconds}s (~${Math.round(totalSeconds / 60)} min)`);

const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
if (!u) {
  console.error(`Utente non trovato: ${email}. Registrati prima su /registrati.`);
  process.exit(1);
}
const [m] = await db
  .select({ orgId: member.organizationId })
  .from(member)
  .where(eq(member.userId, u.id))
  .limit(1);
if (!m) {
  console.error("L'utente non ha un'organizzazione personale (membership mancante).");
  process.exit(1);
}

const [e] = await db
  .insert(enrollment)
  .values({ organizationId: m.orgId, userId: u.id, courseId, source: "manual", status: "active" })
  .onConflictDoNothing({ target: [enrollment.userId, enrollment.courseId] })
  .returning({ id: enrollment.id });

console.log(`\nOK · enrollmentId=${e?.id ?? "(già iscritto)"}`);
console.log(`Apri:  /dashboard  →  /corso/${e?.id ?? "<enrollmentId>"}`);
process.exit(0);
