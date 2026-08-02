// B — Salva nel blocco di OGNI slide il ratio esatto (proporzione), misurato con i font veri,
// così il player parte dalla proporzione corretta dal primo frame (niente transitorio, niente
// spazio vuoto). Additivo e reversibile: aggiunge solo il campo `ratio` al blocco html; il
// codice che non lo legge lo ignora. Idempotente (rilanciabile). Da eseguire AL DEPLOY.
//
// Margine prudenziale: la proporzione è calcolata su (H_reale + MARGINE) → box un filo più alto
// della misura, così eventuali differenze di rendering del browser dell'utente non tagliano mai;
// il postMessage del player affina comunque a runtime.
import "dotenv/config";
import { chromium } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slide } from "@/lib/db/schema";

const SLIDE_W = 1280, GUTTER = 380, TOTAL_W = SLIDE_W + GUTTER, BASE_H = 720;
const MARGINE = 24; // px di sicurezza sopra l'altezza misurata.
// Era 12. La divergenza ~20px con la verifica NON era rumore: i due script misuravano a larghezze
// diverse (qui il contenitore era libero, là vincolato a 1280 come nel player). Sistemata la
// geometria qui sotto, 12 basterebbe; si tiene 24 come margine deliberato, costa 12px su ~1000.
const FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";

type Block = { type?: string; html?: string; ratio?: number };

const rows = await db.select({ id: slide.id, blocks: slide.blocks }).from(slide);
console.log(`Slide totali: ${rows.length}`);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1800, height: 2400 } })).newPage();
// Il contenitore DEVE riprodurre la geometria del player (section larga 1280 dentro 1660):
// misurare in un div libero (~1400px) fa andare a capo MENO righe e sottostima l'altezza di
// ogni slide — era la causa vera delle slide che tagliavano (03/08/2026). Stesse identiche
// regole di _verify-all-slides.ts: se le due misure divergono, il ratio salvato è una bugia.
const SHELL = `<!doctype html><link href="${FONTS}" rel=stylesheet><style>body{margin:0}#host{width:${TOTAL_W}px}#host>section{margin-left:${GUTTER}px;width:${SLIDE_W}px!important;box-sizing:border-box!important;overflow:hidden}</style><body><div id=host></div></body>`;
await page.setContent(SHELL, { waitUntil: "networkidle" });
// I font DEVONO essere realmente applicati prima di misurare: `document.fonts.ready` da solo
// mente (a documento vuoto nessuna faccia e' richiesta, quindi risolve subito) e si finisce per
// misurare col carattere di RIPIEGO, che e' piu' largo e gonfia l'altezza. Verificato il
// 03/08/2026: stessa slide 758px col ripiego, 732px coi font veri. Il player usa quelli veri.
await page.evaluate(async () => {
  await Promise.all([
    document.fonts.load('700 48px "Space Grotesk"'),
    document.fonts.load('600 32px "Space Grotesk"'),
    document.fonts.load('400 18px "IBM Plex Sans"'),
    document.fonts.load('600 18px "IBM Plex Sans"'),
    document.fonts.load('700 18px "IBM Plex Sans"'),
    document.fonts.load('400 13px "IBM Plex Mono"'),
    document.fonts.load('500 13px "IBM Plex Mono"'),
  ]);
  await document.fonts.ready;
});

const SOLO = process.argv.slice(2).filter((a) => !a.startsWith("-"));  // diagnosi: limita a certi id
let updated = 0, skipped = 0;
for (const r of rows) {
  if (SOLO.length && !SOLO.includes(r.id)) { skipped++; continue; }
  const blocks = (r.blocks ?? []) as Block[];
  const i = blocks.findIndex((b) => b?.type === "html" && b.html);
  if (i < 0) { skipped++; continue; }
  const sec = (blocks[i].html ?? "").match(/<section[\s\S]*<\/section>/);
  if (!sec) { skipped++; continue; }
  // misura NATURALE: figli intatti, stessa semantica della rete di sicurezza nel player
  // (slide-html.tsx): scrollHeight della section così com'è renderizzata coi font veri.
  // La pagina e' RIUSATA per tutte le slide: misurare subito dopo l'iniezione da altezze
  // sbagliate (font non ancora applicati alla nuova slide -> metriche di fallback). Verificato
  // il 03/08/2026: in passata completa una slide misurava 732px, in isolamento 758px.
  // Rimedio: attendere i font DENTRO la pagina a ogni slide e misurare due volte, tenendo il MAX.
  // DOCUMENTO FRESCO PER OGNI SLIDE. Iniettando in una pagina riusata la misura si sporca:
  // la stessa slide dava 732px in passata completa e 758px da sola (03/08/2026), cioe' una riga
  // di testo in meno — abbastanza da salvare un ratio che TAGLIA. Costa qualche minuto in piu'
  // sull'intero catalogo, ma e' l'unico modo per cui la misura non dipenda da chi viene prima.
  const nat = await page.evaluate((h) => {
    const host = document.getElementById("host")!; host.innerHTML = h;
    const s = host.querySelector("section")! as HTMLElement;
    s.style.height = "auto";
    const n = Math.ceil(s.scrollHeight); host.innerHTML = ""; return n;
  }, sec[0]);
  if (SOLO.length) console.log(`  [diagnosi] ${r.id}: nat=${nat} ratio_salvato=${blocks[i].ratio}`);
  const H = Math.max(BASE_H, nat + 6) + MARGINE;
  const ratio = Math.round((TOTAL_W / H) * 1000) / 1000;
  if (blocks[i].ratio === ratio) { skipped++; continue; } // idempotente
  const next = blocks.map((b, k) => (k === i ? { ...b, ratio } : b));
  await db.update(slide).set({ blocks: next }).where(eq(slide.id, r.id));
  updated++;
  if (updated % 200 === 0) console.log(`  …${updated} aggiornate`);
}
await browser.close();
console.log(`FATTO. aggiornate=${updated} · invariate/saltate=${skipped}`);
process.exit(0);
