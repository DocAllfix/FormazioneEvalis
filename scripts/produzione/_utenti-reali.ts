// Chi c'è davvero in produzione (sola lettura): separa gli account di test e demo da quelli
// veri, e per ogni account vero mostra organizzazione, corsi e come li ha ottenuti.
// Uso: npx tsx scripts/produzione/_utenti-reali.ts
import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.PROD_DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });

const utenti = await sql`
  select u.id, u.email, u.name, u.email_verified, u.created_at
  from "user" u order by u.created_at`;

const tipo = (email: string): string =>
  /@evalis\.test$/.test(email) && /^e2e/.test(email) ? "test automatici (e2e)"
  : /@(evalis|acme)\.test$/.test(email) ? "demo di sviluppo"
  : "account reali (persone o prove manuali)";

const conteggio = new Map<string, number>();
for (const u of utenti) conteggio.set(tipo(u.email), (conteggio.get(tipo(u.email)) ?? 0) + 1);
console.log(`UTENTI IN PRODUZIONE: ${utenti.length}`);
for (const [k, n] of conteggio) console.log(`  ${String(n).padStart(3)}  ${k}`);

const reali = utenti.filter((u) => tipo(u.email).startsWith("account reali"));
console.log(`\nACCOUNT REALI: ${reali.length}\n`);
for (const u of reali) {
  const org = await sql`
    select o.name, o.metadata, m.role from member m join organization o on o.id = m.organization_id
    where m.user_id = ${u.id}`;
  const corsi = await sql`
    select c.title, e.source, e.status, e.created_at from enrollment e join course c on c.id = e.course_id
    where e.user_id = ${u.id} order by e.created_at`;
  const quando = new Date(u.created_at).toISOString().slice(0, 10);
  const orgTxt = org.map((o) => {
    let t = "?";
    try { t = (typeof o.metadata === "string" ? JSON.parse(o.metadata) : o.metadata)?.type ?? "?"; } catch {}
    return `${t === "company" ? "AZIENDA" : "privato"} «${o.name}» (${o.role})`;
  }).join(", ");
  console.log(`${quando}  ${u.email}  —  ${u.name}${u.email_verified ? "" : "  [email NON confermata]"}`);
  if (orgTxt) console.log(`            ${orgTxt}`);
  for (const c of corsi) {
    const come = c.source === "b2c_purchase" ? "ACQUISTATO" : c.source === "manual" ? "assegnato a mano" : c.source;
    console.log(`            · ${String(c.title).split("—")[0].trim()} — ${come}${c.status === "active" ? "" : ` (${c.status})`}`);
  }
}
await sql.end();
process.exit(0);
