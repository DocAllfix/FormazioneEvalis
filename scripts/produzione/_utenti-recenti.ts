// Utenti registrati in PRODUZIONE, dal più recente (sola lettura). Per ciascuno: se ha
// confermato l'email, se ha iscrizioni ai corsi, se ha lasciato attività nel registro.
// Serve a riconoscere gli account di prova prima di decidere cosa farne.
// Uso: npx tsx scripts/produzione/_utenti-recenti.ts [quanti=60]
import "dotenv/config";
import postgres from "postgres";

const quanti = Number(process.argv[2] ?? 60);
const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });

const righe = await sql`
  select u.email, u.name, u.email_verified, u.created_at,
    (select count(*)::int from enrollment e where e.user_id = u.id) as iscrizioni,
    (select count(*)::int from member m where m.user_id = u.id) as organizzazioni
  from "user" u
  order by u.created_at desc
  limit ${quanti}`;
const [tot] = await sql`select count(*)::int as n from "user"`;

console.log(`utenti in produzione: ${tot.n} · mostrati i ${righe.length} più recenti\n`);
console.log("registrato il       conf.  iscr.  email                                          nome");
for (const r of righe) {
  const quando = new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ");
  console.log(
    `${quando}   ${r.email_verified ? "sì " : "NO "}   ${String(r.iscrizioni).padStart(3)}   ${String(r.email).padEnd(46)} ${r.name ?? ""}`,
  );
}
await sql.end();
process.exit(0);
