// Esperimento: la stessa slide misurata 3 volte di fila nello STESSO documento, e poi dopo aver
// forzato il caricamento dei font per famiglia. Serve a distinguere "font non pronti" da
// "contaminazione tra slide". Sola lettura.
import "dotenv/config";
import { chromium } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slide } from "@/lib/db/schema";

const SLIDE_W = 1280, GUTTER = 380, TOTAL_W = SLIDE_W + GUTTER;
const FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";

const [r] = await db.select().from(slide).where(eq(slide.id, process.argv[2])).limit(1);
const b = ((r?.blocks ?? []) as { type?: string; html?: string; ratio?: number }[]).find((x) => x?.type === "html");
const sec = b?.html?.match(/<section[\s\S]*<\/section>/)?.[0];
if (!sec) { console.error("slide senza html"); process.exit(1); }

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1800, height: 2400 } })).newPage();
await page.setContent(
  `<!doctype html><link href="${FONTS}" rel=stylesheet><style>body{margin:0}#host{width:${TOTAL_W}px}</style><body><div id=host></div></body>`,
  { waitUntil: "networkidle" },
);
await page.evaluate(() => document.fonts.ready);

const misure = await page.evaluate(async (h) => {
  const host = document.getElementById("host")!;
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    host.innerHTML = h;
    const s = host.querySelector("section")! as HTMLElement;
    s.style.height = "auto";
    out.push(Math.ceil(s.scrollHeight));
    host.innerHTML = "";
  }
  // ora si forzano davvero le famiglie usate e si rimisura
  await document.fonts.load('700 48px "Space Grotesk"');
  await document.fonts.load('400 18px "IBM Plex Sans"');
  await document.fonts.load('400 13px "IBM Plex Mono"');
  await document.fonts.ready;
  host.innerHTML = h;
  const s2 = host.querySelector("section")! as HTMLElement;
  s2.style.height = "auto";
  out.push(Math.ceil(s2.scrollHeight));
  host.innerHTML = "";
  return { misure: out, fontCaricati: document.fonts.size, stato: document.fonts.status };
}, sec);

console.log(`tre misure di fila : ${misure.misure.slice(0, 3).join(" · ")}`);
console.log(`dopo fonts.load()  : ${misure.misure[3]}`);
console.log(`font nel documento : ${misure.fontCaricati} · stato ${misure.stato}`);
console.log(`ratio salvato ${b?.ratio} → canvas ${(TOTAL_W / (b?.ratio ?? 1)).toFixed(0)}px`);
await browser.close();
process.exit(0);
