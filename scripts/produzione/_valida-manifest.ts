// Validazione dello schema del manifest senza toccare Cloudflare né il DB: dice subito se il
// pacchetto è ben formato (moduli, lezioni, slide, quiz) prima di avere tutte le clip.
import { readFileSync } from "node:fs";
import { courseManifestSchema, collectClipKeys } from "@/features/courses/authoring-manifest";
for (const corso of process.argv.slice(2)) {
  const m = JSON.parse(readFileSync(`produzione/${corso}/manifest.json`, "utf8"));
  const r = courseManifestSchema.safeParse(m);
  if (!r.success) {
    console.log(`${corso}: SCHEMA NON VALIDO`);
    for (const i of r.error.issues.slice(0, 8)) console.log("  ", i.path.join("."), i.message);
    continue;
  }
  const keys = collectClipKeys(r.data);
  const clip = JSON.parse(readFileSync(`produzione/${corso}/clip-map.json`, "utf8"));
  const mancanti = keys.filter((k: string) => !clip[k]?.uid);
  console.log(`${corso}: schema VALIDO · ${keys.length} clip attese · mappate ${keys.length - mancanti.length} · mancanti ${mancanti.length}`);
}
process.exit(0);
