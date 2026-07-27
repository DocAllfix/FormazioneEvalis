// GO-LIVE: esegue seed + verifica del listino in PRODUZIONE chiamando la route
// /api/staff/stripe-golive (che gira su Vercel, dove vive la chiave Stripe LIVE).
// Locale serve solo PREVIEW_TOKEN. Uso:
//   npx tsx scripts/produzione/_golive-seed.ts            → seed di tutte le voci + verifica
//   npx tsx scripts/produzione/_golive-seed.ts --verifica → SOLO verifica (read-only)
//   ... --fase ufficiale                                   → verifica contro i prezzi di listino
import "dotenv/config";
import { CORSI, BUNDLES } from "@/features/billing/listino-dati";

const URL = "https://evalisacademy.it/api/staff/stripe-golive";
const TOKEN = process.env.PREVIEW_TOKEN;
if (!TOKEN) { console.error("PREVIEW_TOKEN mancante in .env"); process.exit(1); }
const soloVerifica = process.argv.includes("--verifica");
const fase = process.argv.includes("--fase") && process.argv[process.argv.indexOf("--fase") + 1] === "ufficiale" ? "ufficiale" : "lancio";

async function call(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "x-golive-token": TOKEN!, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as Record<string, unknown>;
}

const voci = [
  ...CORSI.map((c) => ({ tipo: "corso" as const, slug: c.slug })),
  ...BUNDLES.map((b) => ({ tipo: "bundle" as const, slug: b.slug })),
];

if (!soloVerifica) {
  console.log(`SEED di ${voci.length} voci sul listino LIVE…`);
  await call({ action: "coupons" });
  for (const v of voci) {
    const r = await call({ action: "seed", tipo: v.tipo, slug: v.slug });
    console.log(r.errore ? `  ✗ ${v.slug}: ${r.errore}` : `  ✓ ${r.esito}`);
    if (r.errore) process.exit(1);
  }
  console.log("");
}

console.log(`VERIFICA (fase ${fase}):`);
let fails = 0;
for (const v of voci) {
  const r = await call({ action: "verify", tipo: v.tipo, slug: v.slug, fase });
  if (r.pass) console.log(`  PASS  ${v.slug}`);
  else { fails++; console.log(`  FAIL  ${v.slug} — ${(r.dettagli as string[] | undefined)?.join("; ") ?? r.errore}`); }
}
const coup = await call({ action: "verify", tipo: "coupons" });
if (coup.pass) console.log("  PASS  coupon azienda-20/azienda-30");
else { fails++; console.log(`  FAIL  coupon — ${(coup.dettagli as string[] | undefined)?.join("; ")}`); }

console.log(
  fails === 0
    ? `\nTUTTO PASS (${CORSI.length} corsi + ${BUNDLES.length} pacchetti + coupon) — piattaforma = listino approvato.`
    : `\n${fails} FAIL — NON conforme al listino.`,
);
process.exit(fails === 0 ? 0 : 1);
