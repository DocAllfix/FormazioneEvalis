// Carica la firma EVALIS nel bucket PRIVATO dei certificati (firma/firma-evalis.png).
//
// ⚠️ La firma non sta nel repository, che è pubblico: il PNG si passa da un percorso esterno e
// finisce solo nello storage, da dove il server lo legge quando lo staff emette un attestato.
// Il PNG deve avere lo sfondo trasparente (si posa sulla carta dell'attestato).
// Lo storage è quello di SUPABASE_URL nel .env (oggi lo stesso progetto della produzione).
// Uso: npx tsx scripts/produzione/_carica-firma-evalis.ts <percorso-del-png>
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PERCORSO_FIRMA_EVALIS } from "@/lib/supabase/storage";

const file = process.argv[2];
if (!file) {
  console.error("Uso: _carica-firma-evalis.ts <percorso-del-png>");
  process.exit(2);
}
const bytes = readFileSync(file);
if (bytes.subarray(1, 4).toString("latin1") !== "PNG") {
  console.error("Il file non è un PNG.");
  process.exit(2);
}

const c = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { error } = await c.storage.from("certificates").upload(PERCORSO_FIRMA_EVALIS, bytes, { contentType: "image/png", upsert: true });
if (error) throw error;
const { data } = await c.storage.from("certificates").download(PERCORSO_FIRMA_EVALIS);
const letti = data ? Buffer.from(await data.arrayBuffer()) : null;
console.log(`firma caricata in certificates/${PERCORSO_FIRMA_EVALIS} · ${bytes.length} byte · riletta ${letti?.equals(bytes) ? "identica" : "DIVERSA"}`);
process.exit(letti?.equals(bytes) ? 0 : 1);
