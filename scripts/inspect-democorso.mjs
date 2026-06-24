// Dump contenuto slide #3-14 (Modulo 1+2): titolo, nota attuale, testo visibile.
import { readFileSync } from "node:fs";

const file = "democorso/Corso interattivo ISO 14064-1 (standalone).html";
let s = readFileSync(file, "utf8").replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\//g, "/");

const re = /"([^"]{1,70})"\s+data-screen-label="(\d+)"\s+data-speaker-notes="([\s\S]*?)"\s+style=/g;
const stripTags = (t) =>
  t.replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const screens = [];
let m;
while ((m = re.exec(s)) !== null) {
  screens.push({ title: m[1].trim(), label: +m[2], notes: m[3].replace(/\s+/g, " ").trim(), pos: re.lastIndex });
}
for (let i = 0; i < screens.length; i++) {
  const to = i + 1 < screens.length ? screens[i + 1].pos : screens[i].pos + 6000;
  screens[i].text = stripTags(s.slice(screens[i].pos, to)).slice(0, 500);
}

for (const sc of screens.filter((x) => x.label >= 3 && x.label <= 14)) {
  console.log(`\n========== #${sc.label}  «${sc.title}» ==========`);
  console.log(`NOTA ATTUALE (${sc.notes.split(" ").length} parole): ${sc.notes}`);
  console.log(`TESTO SLIDE: ${sc.text}`);
}
