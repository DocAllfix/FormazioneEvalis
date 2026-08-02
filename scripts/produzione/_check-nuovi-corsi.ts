// Controllo rapido dello stato dei due percorsi manageriali in DB (solo lettura):
// pubblicazione, categoria (decide la sezione di landing), copertina, monte-ore e prezzi.
import "dotenv/config";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";

const SLUG = [
  "esg-manager-uni-pdr-109-1",
  "energy-manager-esperto-in-gestione-dell-energia",
];

const righe = await db
  .select({
    slug: course.slug,
    title: course.title,
    status: course.status,
    category: course.category,
    imageUrl: course.imageUrl,
    requiredMinutes: course.requiredMinutes,
    priceCents: course.priceCents,
    listPriceCents: course.listPriceCents,
    stripePriceId: course.stripePriceId,
  })
  .from(course)
  .where(inArray(course.slug, SLUG));

for (const s of SLUG) {
  const c = righe.find((r) => r.slug === s);
  if (!c) {
    console.log(`${s}: NON ANCORA IN DB`);
    continue;
  }
  console.log(
    `${c.slug}\n  titolo   ${c.title}\n  stato    ${c.status} · categoria ${c.category ?? "—"}\n` +
      `  copertina ${c.imageUrl ?? "MANCANTE"}\n  monte-ore ${c.requiredMinutes} min\n` +
      `  prezzo   ${c.priceCents ?? "—"} (barrato ${c.listPriceCents ?? "—"}) · price Stripe ${c.stripePriceId ?? "MANCANTE"}`,
  );
}
process.exit(0);
