// PAGINA DI COLLAUDO di un corso: per OGNI slide, il fotogramma reale del player (dalla passata
// Playwright in produzione), un fotogramma dell'AVATAR preso dalla clip vera su Cloudflare Stream
// (URL firmato, a metà durata), titolo, modulo, durata e layout. Un solo file HTML con le immagini
// incorporate, da aprire nel browser o pubblicare come pagina condivisa. Sola lettura del DB.
// Prerequisito: _qa-playwright.ts --course <corso> (fotogrammi in produzione/_qa-playwright/<corso>/).
// Uso: npx tsx scripts/produzione/_pagina-collaudo.ts [--prod] <corso> <slug>
const args = process.argv.slice(2);
const { config } = await import("dotenv");
config();
if (args.includes("--prod")) process.env.DATABASE_URL = process.env.PROD_DATABASE_URL; // prima del client
const [corso, slug] = args.filter((a) => !a.startsWith("--"));
if (!corso || !slug) { console.error("Uso: _pagina-collaudo.ts [--prod] <corso> <slug>"); process.exit(2); }

const fs = await import("node:fs");
const path = await import("node:path");
const sharp = (await import("sharp")).default;
const { asc, eq } = await import("drizzle-orm");
const { db } = await import("@/lib/db");
const { course, module: moduleT, lesson, slide } = await import("@/lib/db/schema");
const { signStreamToken } = await import("@/lib/cloudflare/stream");

const P = `produzione/${corso}`;
const leggi = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const clipMap: Record<string, { uid: string; duration: number }> = leggi(`${P}/clip-map.json`);
const uidToId = Object.fromEntries(Object.entries(clipMap).map(([id, v]) => [v.uid, id]));
const audio: Record<string, { duration: number }> = leggi(`${P}/audio-map.json`);
const layout: Record<string, string> = {};
for (const f of fs.readdirSync(`${P}/_slide-src`)) for (const s of leggi(`${P}/_slide-src/${f}`)) layout[s.id] = s.layout;
const cop = leggi(`${P}/copioni.json`);
const titoliMod: Record<string, string> = {};
for (const r of fs.readFileSync(`${P}/struttura.md`, "utf8").matchAll(/\|\s*M(\d+)\s*\|([^|]+)\|/g)) titoliMod[`m${r[1].padStart(2, "0")}`] = r[2].trim();
const titoloCop = Object.fromEntries(cop.slides.map((s: { id: string; titolo: string }) => [s.id, s.titolo]));

// stesso ordine della passata Playwright (modulo → lezione → slide per posizione)
const [c] = await db.select().from(course).where(eq(course.slug, slug)).limit(1);
if (!c) { console.error(`corso ${slug} non trovato`); process.exit(1); }
const ordine: { uid: string | null; titolo: string }[] = [];
for (const m of await db.select().from(moduleT).where(eq(moduleT.courseId, c.id)).orderBy(asc(moduleT.position)))
  for (const l of await db.select().from(lesson).where(eq(lesson.moduleId, m.id)).orderBy(asc(lesson.position)))
    for (const s of await db.select().from(slide).where(eq(slide.lessonId, l.id)).orderBy(asc(slide.position)))
      ordine.push({ uid: s.avatarClipUid, titolo: s.title });

const code = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;
const dataUri = (b: Buffer, mime: string) => `data:${mime};base64,${b.toString("base64")}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

type Voce = { i: number; id: string; mod: string; titolo: string; dur: number; layout: string; slideImg: string; avatarImg: string; problemi: string[] };
const voci: Voce[] = [];
const conc = 8;
let prossimo = 0;
async function lavora() {
  while (prossimo < ordine.length) {
    const i = prossimo++;
    const o = ordine[i];
    const id = o.uid ? uidToId[o.uid] : "";
    const problemi: string[] = [];
    if (!id) problemi.push("clip non riconosciuta nella clip-map");
    const frame = path.join("produzione/_qa-playwright", corso, `${String(i).padStart(3, "0")}.png`);
    let slideImg = "";
    if (fs.existsSync(frame)) slideImg = dataUri(await sharp(frame).resize({ width: 560 }).webp({ quality: 58 }).toBuffer(), "image/webp");
    else problemi.push("fotogramma del player mancante");
    const dur = id ? audio[id]?.duration ?? clipMap[id].duration : 0;
    let avatarImg = "";
    if (o.uid && code) {
      const url = `https://customer-${code}.cloudflarestream.com/${signStreamToken(o.uid, 600)}/thumbnails/thumbnail.jpg?time=${Math.max(1, Math.floor(dur / 2))}s&height=220`;
      for (let t = 0; t < 3 && !avatarImg; t++) {
        const r = await fetch(url).catch(() => null);
        if (r?.ok) avatarImg = dataUri(await sharp(Buffer.from(await r.arrayBuffer())).webp({ quality: 62 }).toBuffer(), "image/webp");
      }
      if (!avatarImg) problemi.push("fotogramma avatar non scaricabile da Stream");
    }
    if (id && Math.abs((clipMap[id].duration ?? 0) - dur) > 1) problemi.push("durata clip diversa dall'audio");
    voci[i] = { i, id, mod: id.split("_")[1] ?? "", titolo: titoloCop[id] ?? o.titolo, dur, layout: layout[id] ?? "", slideImg, avatarImg, problemi };
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${ordine.length}`);
  }
}
await Promise.all(Array.from({ length: conc }, lavora));

const moduli = [...new Set(voci.map((v) => v.mod))];
const totMin = Math.round(voci.reduce((a, v) => a + v.dur, 0) / 60);
const conProblemi = voci.filter((v) => v.problemi.length);
const scheda = (v: Voce) => `
<article class="slide${v.problemi.length ? " ko" : ""}" id="${v.id}">
  <div class="media">
    <figure class="frame">${v.slideImg ? `<img src="${v.slideImg}" alt="Slide ${esc(v.id)} nel player" loading="lazy">` : `<div class="vuoto">fotogramma mancante</div>`}</figure>
    <figure class="avatar">${v.avatarImg ? `<img src="${v.avatarImg}" alt="Avatar della clip ${esc(v.id)}" loading="lazy">` : `<div class="vuoto">avatar mancante</div>`}</figure>
  </div>
  <div class="meta">
    <span class="sid">${esc(v.id.replace(`${corso}_`, ""))}</span>
    <h3>${esc(v.titolo)}</h3>
    <div class="tags"><span>${mmss(v.dur)}</span><span>${esc(v.layout)}</span>${v.problemi.map((p) => `<span class="err">${esc(p)}</span>`).join("")}</div>
  </div>
</article>`;

const html = `<title>Collaudo PAS 24000</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Banco di collaudo: indice dei moduli in alto, poi schede slide in griglia (fotogramma player + avatar), palette Ambra del prodotto */
:root{--bg:#F8F4EC;--card:#FFFDF9;--ink:#241C13;--muted:#7A6C58;--line:#E6DCCB;--accent:#C2410C;--ok:#3F6B3A;--ko:#B42318;--kobg:#FDECEA;
--display:"Space Grotesk",system-ui,sans-serif;--body:"IBM Plex Sans",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1A140E;--card:#241C13;--ink:#F1E8DA;--muted:#B3A48D;--line:#3A2E22;--accent:#F08A4B;--ok:#8FBF85;--ko:#F2877C;--kobg:#3A1D19;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#1A140E;--card:#241C13;--ink:#F1E8DA;--muted:#B3A48D;--line:#3A2E22;--accent:#F08A4B;--ok:#8FBF85;--ko:#F2877C;--kobg:#3A1D19;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.5}
.wrap{max-width:1500px;margin:0 auto;padding-inline:20px;padding-block:28px 60px}
header h1{font-family:var(--display);font-weight:600;font-size:clamp(26px,4vw,38px);line-height:1.1;margin:0;text-wrap:balance}
header p{color:var(--muted);margin:8px 0 0;max-width:72ch}
.esito{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 0}
.esito span{font-family:var(--mono);font-size:12.5px;border:1px solid var(--line);border-radius:999px;padding:4px 11px;background:var(--card)}
.esito .ok{color:var(--ok);border-color:currentColor}.esito .ko{color:var(--ko);border-color:currentColor}
nav{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);border-bottom:1px solid var(--line);margin:22px -20px 0;padding:10px 20px;display:flex;gap:6px;overflow-x:auto}
nav a{font-family:var(--mono);font-size:12.5px;color:var(--ink);text-decoration:none;border:1px solid var(--line);border-radius:6px;padding:5px 9px;white-space:nowrap;background:var(--card)}
nav a:hover,nav a:focus-visible{border-color:var(--accent);color:var(--accent);outline:none}
section{margin-top:34px;scroll-margin-top:70px}
section h2{font-family:var(--display);font-weight:600;font-size:21px;margin:0 0 14px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
section h2 small{font-family:var(--mono);font-size:12.5px;color:var(--muted);font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,430px),1fr));gap:14px}
.slide{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.slide.ko{border-color:var(--ko);background:var(--kobg)}
.media{display:grid;grid-template-columns:1fr 104px;gap:0;border-bottom:1px solid var(--line)}
.media figure{margin:0;min-width:0}
.media img{display:block;width:100%;height:100%;object-fit:cover}
.frame img{object-fit:contain;background:#0d0a07}
.avatar{border-left:1px solid var(--line)}
.vuoto{display:grid;place-items:center;height:100%;min-height:90px;font-family:var(--mono);font-size:12px;color:var(--ko)}
.meta{padding:10px 12px 12px;min-width:0}
.sid{font-family:var(--mono);font-size:11.5px;color:var(--accent);letter-spacing:.04em}
.meta h3{font-family:var(--display);font-weight:500;font-size:15.5px;line-height:1.25;margin:3px 0 7px}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tags span{font-family:var(--mono);font-size:11.5px;color:var(--muted);border:1px solid var(--line);border-radius:5px;padding:1px 6px;font-variant-numeric:tabular-nums}
.tags .err{color:var(--ko);border-color:var(--ko)}
@media (max-width:520px){.media{grid-template-columns:1fr 84px}}
</style>
<div class="wrap">
<header>
  <h1>Collaudo PAS 24000:2022 — Sistema di gestione sociale</h1>
  <p>Ogni scheda è una slide del corso in produzione: a sinistra il fotogramma reale del player su evalisacademy.it, a destra un fotogramma dell'avatar preso dalla clip vera su Cloudflare Stream, a metà durata.</p>
  <div class="esito">
    <span class="ok">${voci.length} slide</span><span>${moduli.length} moduli</span><span>${totMin} minuti di audio</span>
    <span class="${conProblemi.length ? "ko" : "ok"}">${conProblemi.length ? `${conProblemi.length} slide da guardare` : "nessuna anomalia"}</span>
    <span>generata ${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</span>
  </div>
</header>
<nav aria-label="Moduli">${moduli.map((m) => `<a href="#${m}">${m.toUpperCase()}</a>`).join("")}</nav>
${moduli.map((m) => {
  const vs = voci.filter((v) => v.mod === m);
  return `<section id="${m}"><h2>${m.toUpperCase()} · ${esc(titoliMod[m] ?? "")} <small>${vs.length} slide · ${Math.round(vs.reduce((a, v) => a + v.dur, 0) / 60)} min</small></h2><div class="grid">${vs.map(scheda).join("")}</div></section>`;
}).join("")}
</div>`;

const out = `${P}/${corso}-collaudo.html`;
fs.writeFileSync(out, html);
console.log(`${out} · ${voci.length} slide · ${(fs.statSync(out).size / 1048576).toFixed(1)} MB · anomalie ${conProblemi.length}`);
for (const v of conProblemi) console.log(`  ${v.id || "#" + v.i}: ${v.problemi.join("; ")}`);
process.exit(0);
export {};
