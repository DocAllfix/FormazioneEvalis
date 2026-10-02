// Certificati in PRODUZIONE (sola lettura): quanti per stato, e quante iscrizioni vere hanno
// superato l'esame finale. Nessun dato personale stampato.
// Uso: npx tsx scripts/produzione/_stato-certificati.ts
import "dotenv/config";
import postgres from "postgres";
const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
const stati = await sql`select status, count(*)::int n, max(created_at) ultimo from certificate group by status`;
console.log("certificati per stato:", stati.length ? stati.map((s) => `${s.status}=${s.n} (ultimo ${s.ultimo?.toISOString?.().slice(0, 10)})`).join(" · ") : "nessuno");
const [esami] = await sql`
  select count(distinct a.enrollment_id)::int n from quiz_attempt a join quiz q on q.id = a.quiz_id
  where q.type = 'final' and a.passed`;
console.log("iscrizioni con esame finale superato:", esami.n);
const [att] = await sql`
  select count(*)::int n, count(distinct e.user_id)::int persone from enrollment e
  join "user" u on u.id = e.user_id where e.status = 'active' and u.email not like '%@evalis.test' and u.email not like '%example%'`;
console.log(`iscrizioni attive (utenti non di prova): ${att.n} di ${att.persone} persone`);
const prog = await sql`
  select e.id, c.required_minutes,
    (select count(*) from slide_progress sp where sp.enrollment_id = e.id and sp.completed_at is not null)::int fatte
  from enrollment e join course c on c.id = e.course_id join "user" u on u.id = e.user_id
  where e.status = 'active' and u.email not like '%@evalis.test' and u.email not like '%example%'
  order by fatte desc limit 5`;
console.log("le 5 iscrizioni più avanti (slide completate):", prog.map((p) => p.fatte).join(", "));
await sql.end();
process.exit(0);
