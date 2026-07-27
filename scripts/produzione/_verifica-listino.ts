// VERIFICA del listino (CLI locale, read-only): stessa implementazione della route di
// go-live. PASS/FAIL per 13 corsi + 5 bundle (composizione esatta) + 2 coupon.
// --fase lancio (default) | ufficiale. Exit 1 se anche una sola voce FAIL.
import "dotenv/config";
import { getStripe } from "@/lib/stripe/client";
import { CORSI, BUNDLES } from "@/features/billing/listino-dati";
import { verifyCorsoBySlug, verifyBundleBySlug, verifyCoupons } from "@/features/billing/listino-seed";

const fase = process.argv.includes("--fase") && process.argv[process.argv.indexOf("--fase") + 1] === "ufficiale" ? "ufficiale" : "lancio";
const stripe = getStripe();
let fails = 0;
const stampa = (label: string, pass: boolean, dettagli: string[]) => {
  if (pass) console.log(`  PASS  ${label}`);
  else { fails++; console.log(`  FAIL  ${label} — ${dettagli.join("; ")}`); }
};

console.log(`VERIFICA LISTINO — fase: ${fase.toUpperCase()}`);
console.log("Corsi:");
for (const c of CORSI) { const v = await verifyCorsoBySlug(stripe, c.slug, fase); stampa(c.slug, v.pass, v.dettagli); }
console.log("Bundle:");
for (const b of BUNDLES) { const v = await verifyBundleBySlug(stripe, b.slug, fase); stampa(b.slug, v.pass, v.dettagli); }
console.log("Coupon azienda:");
{ const v = await verifyCoupons(stripe); stampa("azienda-20/azienda-30", v.pass, v.dettagli); }

console.log(fails === 0 ? `\nTUTTO PASS (${CORSI.length} corsi + ${BUNDLES.length} bundle + coupon) — piattaforma = listino.` : `\n${fails} FAIL — NON conforme al listino.`);
process.exit(fails === 0 ? 0 : 1);
