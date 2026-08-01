// Estrae il contenuto didattico dai moduli HTML del committente (array JS `S.push({sec,title,html})`)
// nel formato _fonte/<mNN>.txt usato dalla fabbrica (una sezione per schermata).
// Uso: node scripts/produzione/_estrai-fonte-esg.mjs <cartellaHTML> <corso>
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const [dir, corso] = process.argv.slice(2);
if (!dir || !corso) { console.error("Uso: _estrai-fonte-esg.mjs <cartellaHTML> <corso>"); process.exit(2); }
const out = `produzione/${corso}/_fonte`;
mkdirSync(out, { recursive: true });

function testo(htmlFrammento) {
  return htmlFrammento
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section)>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&rsquo;|&#8217;/g, "'").replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")
    .replace(/&egrave;/g, "è").replace(/&agrave;/g, "à").replace(/&igrave;/g, "ì").replace(/&ograve;/g, "ò")
    .replace(/&ugrave;/g, "ù").replace(/&eacute;/g, "é").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#8212;|&mdash;/g, "—").replace(/&#8211;|&ndash;/g, "–").replace(/&hellip;/g, "…")
    .replace(/[ \t]+/g, " ")
    .split("\n").map((r) => r.trim()).filter(Boolean).join("\n");
}

const file = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".html"));
let totale = 0;
for (const f of file) {
  const n = f.match(/_M(\d+)_/)?.[1];
  if (!n) { console.error(`salto (numero modulo non riconosciuto): ${f}`); continue; }
  const mod = `m${String(n).padStart(2, "0")}`;
  const h = readFileSync(path.join(dir, f), "utf8");
  const blocchi = [...h.matchAll(/S\.push\(\{[^}]*?title:\s*"([^"]*)"[^}]*?html:\s*`([\s\S]*?)`\s*\}\)/g)];
  if (blocchi.length === 0) { console.error(`nessuna schermata estratta da ${f}`); continue; }
  const righe = blocchi.map(([, titolo, corpo], i) => `### SCHERMATA ${i + 1} — ${titolo}\n${testo(corpo)}`);
  writeFileSync(`${out}/${mod}.txt`, righe.join("\n\n") + "\n");
  const parole = righe.join(" ").split(/\s+/).length;
  console.log(`${mod}: ${blocchi.length} schermate · ${parole} parole → ${out}/${mod}.txt`);
  totale += parole;
}
console.log(`\nFONTE ESTRATTA: ${file.length} moduli · ${totale} parole totali`);
