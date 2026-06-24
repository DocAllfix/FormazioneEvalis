// Estrae le 5 domande del "Quiz intermedio 1" + cerca la chiave delle risposte corrette.
import { readFileSync } from "node:fs";

const file = "democorso/Corso interattivo ISO 14064-1 (standalone).html";
let s = readFileSync(file, "utf8").replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\//g, "/");
const txt = s.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

console.log("== DOMANDE Quiz intermedio 1 ==");
const re = /Quiz intermedio 1 · 0(\d) \/ 5 Interattivo (.+?) A (.+?) B (.+?) C (.+?) D (.+?) Seleziona/g;
let m;
while ((m = re.exec(txt)) !== null) {
  console.log(`\nDomanda ${m[1]}: ${m[2].trim()}`);
  console.log(`   A) ${m[3].trim()}`);
  console.log(`   B) ${m[4].trim()}`);
  console.log(`   C) ${m[5].trim()}`);
  console.log(`   D) ${m[6].trim()}`);
}

console.log("\n== chiave risposte corrette (cerco nei <script>) ==");
// possibili forme: q1:[...], answers q1, correct map, ecc.
for (const pat of [
  /q1["']?\s*[:=]\s*\[[^\]]{1,40}\]/g,
  /["']?(correct|corrette|answers|sol)["']?\s*[:=]\s*\{[^}]{1,120}\}/gi,
  /q1[^a-z][\s\S]{0,80}?(correct|opt|[0-3])/gi,
]) {
  const hit = s.match(pat);
  if (hit) console.log(pat.source.slice(0, 30), "→", hit.slice(0, 3));
}
