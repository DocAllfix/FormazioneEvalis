// Verifica del blog pubblicato. Sul modello di _verifica-clip-r2.py: numeri che devono tornare.
//
//   npx tsx scripts/produzione/_verifica-blog.ts --sito https://evalisacademy.it \
//        [--cms https://cms.evalisacademy.it] [--max 10]
//
// Esce con codice 1 se anche un solo controllo e' rosso: cosi' puo' bloccare una pubblicazione
// invece di limitarsi a raccontarla.
//
// La GUARDIA SUL CONTEGGIO vive qui e non nei controlli condivisi perche' e' l'unico che ha
// bisogno di memoria: confronta con l'ultimo giro, salvato in produzione/_blog/conteggio.json.
// Se gli articoli online sono MENO di prima, e' rosso: e' il segnale che un giro a vuoto ha
// pubblicato meno di quanto c'era, ed e' esattamente il guasto che passa inosservato.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { verificaBlog, riepilogo, type Esito } from "../../src/features/blog/verifica";

const MEMORIA = "produzione/_blog/conteggio.json";

function argomento(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function guardiaConteggio(esiti: Esito[], aggiorna: boolean): Esito {
  const riga = esiti.find((e) => e.nome === "conteggio");
  const adesso = Number(riga?.dettaglio.match(/^(\d+)/)?.[1] ?? 0);

  let prima = 0;
  if (existsSync(MEMORIA)) {
    try {
      prima = Number(JSON.parse(readFileSync(MEMORIA, "utf8")).articoli ?? 0);
    } catch {
      prima = 0;
    }
  }

  const ok = adesso >= prima;
  if (ok && aggiorna) {
    mkdirSync(dirname(MEMORIA), { recursive: true });
    writeFileSync(
      MEMORIA,
      JSON.stringify({ articoli: adesso, quando: new Date().toISOString() }, null, 2) + "\n",
      "utf8",
    );
  }

  return {
    nome: "guardia-conteggio",
    ok,
    dettaglio: ok
      ? `${adesso} articoli online (prima ${prima})`
      : `ONLINE ${adesso}, PRIMA ERANO ${prima}: sono spariti ${prima - adesso} articoli`,
  };
}

async function main() {
  const sito = argomento("sito") ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!sito) {
    console.error("Serve --sito https://… (oppure NEXT_PUBLIC_APP_URL)");
    process.exit(2);
  }
  const cms = argomento("cms") ?? process.env.BLOG_CMS_URL;
  const massimoArticoli = Number(argomento("max") ?? 0);

  console.log(`Verifica di ${sito}${cms ? ` (CMS ${cms})` : " — nessun CMS indicato"}\n`);

  const esiti = await verificaBlog({ sito, cms, massimoArticoli });
  // la guardia non aggiorna la memoria se qualcos'altro e' rosso: non si fissa come "normale"
  // un numero raccolto in una giornata storta
  const altroVerde = esiti.every((e) => e.ok);
  esiti.push(guardiaConteggio(esiti, altroVerde));

  const { ok, righe } = riepilogo(esiti);
  for (const r of righe) console.log(r);
  console.log(`\n${ok ? "TUTTO VERDE" : "CI SONO CONTROLLI ROSSI"}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("La verifica non e' riuscita a girare:", e);
  process.exit(1);
});
