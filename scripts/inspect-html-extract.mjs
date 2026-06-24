// Dev helper: estrae il CSS <style> del democorso e l'HTML grezzo di una slide,
// per progettare il rendering in iframe. Sola lettura.
import { readFileSync } from "node:fs";

const FILE = "democorso/Corso interattivo ISO 14064-1 (standalone).html";
let s = readFileSync(FILE, "utf8").replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\//g, "/");

// 1) blocchi <style>
const styles = [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
console.log(`== <style> trovati: ${styles.length} ==`);
styles.forEach((css, i) => console.log(`  style[${i}] lunghezza=${css.length}`));
const allCss = styles.join("\n");
console.log("\n== primi 1200 char di CSS ==\n" + allCss.slice(0, 1200));

// 2) HTML grezzo di una slide (label N)
const re = /<(section|div|article)([^>]*\bdata-screen-label="(\d+)"[^>]*)>/gi;
const marks = [];
let m;
while ((m = re.exec(s)) !== null) marks.push({ tag: m[1], label: +m[3], start: m.index });
console.log(`\n== slide trovate (per tag/label): ${marks.length} ==`);
console.log(marks.slice(0, 16).map((x) => `#${x.label}:${x.tag}`).join("  "));

const target = marks.find((x) => x.label === 5);
if (target) {
  const next = marks.find((x) => x.start > target.start);
  const raw = s.slice(target.start, next ? next.start : target.start + 2500);
  console.log("\n== SLIDE #5 RAW (primi 2200) ==\n" + raw.slice(0, 2200));
}
