// INTEGRITÀ DI TUTTO IL CATALOGO (sola lettura). Per ogni corso pubblicato controlla quello che lo
// studente vedrà: struttura (moduli → lezioni → slide), clip e durate, monte ore, domande dei quiz e
// il PERCORSO DEL PLAYER (ogni checkpoint e l'esame presenti e al loro posto: integrita.ts).
// Da lanciare a ogni ingest e periodicamente. Esce con 1 se trova problemi.
//
// Uso: npx tsx scripts/produzione/_integrita-catalogo.ts [--prod] [--tutti]
//   --prod   database di PRODUZIONE (PROD_DATABASE_URL) invece che di sviluppo
//   --tutti  anche i corsi in bozza (di default solo i pubblicati)
// Le slide "Copertina" e "Chiusura" sono senza video per scelta (5 s di schermata): ammesse.
import "dotenv/config";
const suProd = process.argv.includes("--prod");
if (suProd) {
  if (!process.env.PROD_DATABASE_URL) { console.error("PROD_DATABASE_URL mancante"); process.exit(2); }
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL; // prima di importare il client
}
const tutti = process.argv.includes("--tutti");

const { sql } = await import("drizzle-orm");
const { db } = await import("@/lib/db");
const { problemiSequenzaPlayer } = await import("@/features/courses/integrita");
const { caricaStrutturaCorso } = await import("./_struttura-corso");

type Riga = Record<string, unknown>;
const corsi = (await db.execute(sql`
  select c.id, c.title, c.status, c.required_minutes,
    (select count(*) from module m where m.course_id = c.id)::int as moduli,
    (select count(*) from module m where m.course_id = c.id and not exists (select 1 from lesson l where l.module_id = m.id))::int as moduli_vuoti,
    (select count(*) from lesson l join module m on m.id = l.module_id where m.course_id = c.id and not exists (select 1 from slide s where s.lesson_id = l.id))::int as lezioni_vuote,
    (select count(*) from slide s join lesson l on l.id = s.lesson_id join module m on m.id = l.module_id where m.course_id = c.id and (coalesce(s.audio_seconds, 0) <= 0 or (s.avatar_clip_uid is null and s.title not in ('Copertina', 'Chiusura'))))::int as slide_senza_clip,
    (select coalesce(sum(s.audio_seconds), 0) from slide s join lesson l on l.id = s.lesson_id join module m on m.id = l.module_id where m.course_id = c.id)::int as secondi,
    (select count(*) from quiz q where q.course_id = c.id and q.type = 'checkpoint')::int as checkpoint,
    (select count(*) from quiz_question d where d.course_id = c.id and not (d.options @> jsonb_build_array(jsonb_build_object('id', d.correct_option_id))))::int as risposte_non_valide,
    (select count(*) from quiz_question d where d.course_id = c.id and jsonb_array_length(d.options) < 2)::int as domande_con_poche_opzioni
  from course c
  where ${tutti ? sql`true` : sql`c.status = 'published'`} and c.title not like 'Corso E2E%'
  order by c.title`)) as unknown as Riga[];

let corsiConProblemi = 0;
for (const c of corsi) {
  const p: string[] = [];
  if (Number(c.moduli) === 0) p.push("nessun modulo");
  if (Number(c.moduli_vuoti)) p.push(`${c.moduli_vuoti} moduli senza lezioni`);
  if (Number(c.lezioni_vuote)) p.push(`${c.lezioni_vuote} lezioni senza slide`);
  if (Number(c.slide_senza_clip)) p.push(`${c.slide_senza_clip} slide senza clip o durata`);
  if (Number(c.secondi) < Number(c.required_minutes) * 60) p.push(`monte ore: ${Math.round(Number(c.secondi) / 60)} min < ${c.required_minutes} richiesti`);
  if (Number(c.checkpoint) !== Number(c.moduli)) p.push(`checkpoint ${c.checkpoint} per ${c.moduli} moduli`);
  if (Number(c.risposte_non_valide)) p.push(`${c.risposte_non_valide} domande con risposta giusta non tra le opzioni`);
  if (Number(c.domande_con_poche_opzioni)) p.push(`${c.domande_con_poche_opzioni} domande con meno di 2 opzioni`);
  p.push(...problemiSequenzaPlayer(await caricaStrutturaCorso(db, String(c.id))).map((x) => `percorso player: ${x}`));
  if (p.length) corsiConProblemi++;
  console.log(`${p.length ? "✗" : "✓"} ${String(c.title).slice(0, 60)}${c.status !== "published" ? ` [${c.status}]` : ""}`);
  for (const x of p.slice(0, 8)) console.log(`    ${x}`);
  if (p.length > 8) console.log(`    … e altri ${p.length - 8}`);
}
console.log(`\n${suProd ? "PRODUZIONE" : "SVILUPPO"}: ${corsi.length} corsi controllati · ${corsiConProblemi ? `${corsiConProblemi} CON PROBLEMI` : "tutti integri"}`);
process.exit(corsiConProblemi ? 1 : 0);
