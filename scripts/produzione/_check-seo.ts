import "dotenv/config";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
const rows = await db.select({ slug: course.slug, title: course.title }).from(course)
  .where(and(eq(course.status, "published"), isNull(course.organizationId)));
let ok = 0, ko = 0;
for (const r of rows) {
  const html = await fetch(`https://evalisacademy.it/catalogo/${r.slug}`).then((x) => x.text()).catch(() => "");
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const desc = !!html.match(/<meta name="description"/);
  const canon = !!html.match(/<link rel="canonical"/);
  const og = !!html.match(/property="og:title"/);
  const generico = title.includes("Certifica le tue competenze");
  const buono = !generico && desc && canon && og;
  buono ? ok++ : ko++;
  console.log(`${buono ? "OK  " : "KO  "} ${r.slug}  | title="${title.slice(0, 45)}" desc=${desc} canonical=${canon} og=${og}`);
}
console.log(`\nPAGINE CORSO: ${ok} complete · ${ko} incomplete (su ${rows.length})`);
process.exit(0);
