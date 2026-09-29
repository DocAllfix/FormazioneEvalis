// Come sta andando un utente in PRODUZIONE (sola lettura): accessi, pagamenti, avanzamento
// corso per corso (slide completate, tempo effettivo contro il monte ore), quiz, ultime
// attività del registro ed eventuali ticket. Non scrive nulla.
// Uso: npx tsx scripts/produzione/_stato-utente.ts <email>
import "dotenv/config";
import postgres from "postgres";

const email = process.argv[2];
if (!email) { console.error("Uso: _stato-utente.ts <email>"); process.exit(2); }
const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const d = (x: unknown) => (x ? new Date(x as string).toISOString().slice(0, 16).replace("T", " ") : "—");
const ore = (s: number) => `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;

const [u] = await sql`select id, name, email_verified, created_at from "user" where email = ${email}`;
if (!u) { console.log(`nessun utente ${email}`); process.exit(0); }
console.log(`${u.name} <${email}> — registrata ${d(u.created_at)} — email ${u.email_verified ? "confermata" : "NON confermata"}`);

const sess = await sql`select count(*)::int as n, max(updated_at) as ultimo, max(created_at) as ultimo_login from session where user_id = ${u.id}`;
const disp = await sql`select distinct user_agent from session where user_id = ${u.id} and user_agent is not null limit 5`;
console.log(`\nACCESSI: ${sess[0].n} sessioni · ultimo login ${d(sess[0].ultimo_login)} · ultima attività di sessione ${d(sess[0].ultimo)}`);
for (const r of disp) {
  const ua = String(r.user_agent);
  const sistema = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "altro";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "altro";
  console.log(`  dispositivo: ${sistema} · ${browser}`);
}

const pag = await sql`select type, amount_total, currency, occurred_at from payment_event where user_id = ${u.id} order by occurred_at`;
console.log(`\nPAGAMENTI: ${pag.length}`);
for (const p of pag) console.log(`  ${d(p.occurred_at)}  ${p.type}  ${p.amount_total != null ? (p.amount_total / 100).toFixed(2) + " " + String(p.currency).toUpperCase() : ""}`);

const iscr = await sql`
  select e.id, e.created_at, e.status, e.source, c.title, c.required_minutes, c.id as course_id
  from enrollment e join course c on c.id = e.course_id where e.user_id = ${u.id} order by e.created_at`;
for (const e of iscr) {
  const [tot] = await sql`
    select count(*)::int as n from slide s join lesson l on l.id = s.lesson_id join module m on m.id = l.module_id
    where m.course_id = ${e.course_id}`;
  const [sp] = await sql`
    select count(*)::int as toccate, count(completed_at)::int as completate,
      coalesce(sum(effective_seconds), 0)::int as secondi, max(updated_at) as ultimo
    from slide_progress where enrollment_id = ${e.id}`;
  const [lp] = await sql`select count(completed_at)::int as lezioni_ok, count(*)::int as lezioni from lesson_progress where enrollment_id = ${e.id}`;
  const [hb] = await sql`select count(*)::int as n, max(ts) as ultimo from heartbeat where enrollment_id = ${e.id}`;
  const quiz = await sql`
    select q.title, a.score, a.passed, a.submitted_at from quiz_attempt a join quiz q on q.id = a.quiz_id
    where a.enrollment_id = ${e.id} order by a.created_at`;
  const [cert] = await sql`select count(*)::int as n from certificate where enrollment_id = ${e.id}`.catch(() => [{ n: "?" }]);
  const richiesti = e.required_minutes * 60;
  const pct = richiesti ? Math.round((sp.secondi / richiesti) * 100) : 0;
  console.log(`\nCORSO: ${String(e.title).split("—")[0].trim()}  (${e.source}, ${e.status}, dal ${d(e.created_at)})`);
  console.log(`  slide completate ${sp.completate}/${tot.n} (aperte ${sp.toccate}) · lezioni completate ${lp.lezioni_ok}/${lp.lezioni}`);
  console.log(`  tempo effettivo ${ore(sp.secondi)} su ${ore(richiesti)} richiesti (${pct}%) · ultimo avanzamento ${d(sp.ultimo)}`);
  console.log(`  battiti di presenza ${hb.n} · ultimo ${d(hb.ultimo)}`);
  console.log(`  quiz: ${quiz.length ? quiz.map((q) => `${q.title} ${q.score}% ${q.passed ? "SUPERATO" : "non superato"}`).join(" · ") : "nessun tentativo"} · certificati: ${cert.n}`);
}

const att = await sql`select verb, object, created_at from activity_log where user_id = ${u.id} order by created_at desc limit 12`;
console.log(`\nULTIME ATTIVITÀ (registro):`);
for (const a of att) console.log(`  ${d(a.created_at)}  ${a.verb}  ${String(a.object ?? "").slice(0, 50)}`);

const tk = await sql`select count(*)::int as n from ticket where user_id = ${u.id}`.catch(() => [{ n: "?" }]);
console.log(`\nTICKET DI ASSISTENZA: ${tk[0].n}`);
await sql.end();
process.exit(0);
