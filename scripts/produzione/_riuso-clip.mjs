// RIUSO CLIP fra edizioni della stessa norma: completa il clip-map del corso NUOVO con gli
// uid delle clip già pubblicate per il corso PRECEDENTE, per le slide rimaste identiche.
// Le clip restano una sola su Cloudflare Stream (nessun doppione, nessun costo in più):
// due corsi puntano allo stesso uid, e il player autorizza per slide→corso dell'iscrizione.
//
// Sorgente della verità: produzione/<nuovo>/riuso-clip.json  {corsoOrigine, slide[], origine{nuovo:vecchio}}
// ORDINE: SEMPRE dopo _riconcilia.mjs — la riconciliazione ricostruisce il clip-map dai soli
// video presenti su Cloudflare col nome del corso nuovo, quindi cancellerebbe il riuso.
// Uso: node scripts/produzione/_riuso-clip.mjs <corsoNuovo>
import fs from "node:fs";

const nuovo = process.argv[2];
if (!nuovo) { console.error("Uso: _riuso-clip.mjs <corsoNuovo>"); process.exit(2); }

const leggi = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
const riuso = leggi(`produzione/${nuovo}/riuso-clip.json`);
if (!riuso) { console.error(`manca produzione/${nuovo}/riuso-clip.json`); process.exit(1); }

const vecchio = riuso.corsoOrigine;
const clipVecchie = leggi(`produzione/${vecchio}/clip-map.json`);
if (!clipVecchie) { console.error(`manca il clip-map di ${vecchio}`); process.exit(1); }

const clipNuove = leggi(`produzione/${nuovo}/clip-map.json`) ?? {};
const copioni = leggi(`produzione/${nuovo}/copioni.json`);
const attese = new Set(copioni.slides.map((s) => s.id));

let aggiunte = 0, gia = 0, mancanti = [];
for (const idNuovo of riuso.slide) {
  const idVecchio = riuso.origine[idNuovo];
  const clip = clipVecchie[idVecchio];
  if (!clip?.uid) { mancanti.push(idNuovo); continue; }
  if (clipNuove[idNuovo]?.uid) { gia++; continue; }
  clipNuove[idNuovo] = { uid: clip.uid, duration: clip.duration, riusataDa: idVecchio };
  aggiunte++;
}

fs.writeFileSync(`produzione/${nuovo}/clip-map.json`, JSON.stringify(clipNuove, null, 1), "utf8");

const senzaClip = [...attese].filter((id) => !clipNuove[id]?.uid);
console.log(`${nuovo}: ${aggiunte} clip riusate da ${vecchio} (${gia} già presenti)`);
console.log(`clip-map ora copre ${Object.keys(clipNuove).length}/${attese.size} slide`);
if (mancanti.length) console.log(`ATTENZIONE: ${mancanti.length} slide da riusare senza clip nell'origine: ${mancanti.slice(0, 5).join(", ")}`);
if (senzaClip.length) console.log(`ANCORA SENZA CLIP (${senzaClip.length}): ${senzaClip.slice(0, 8).join(", ")}${senzaClip.length > 8 ? " …" : ""}`);
else console.log("tutte le slide del corso hanno una clip.");
