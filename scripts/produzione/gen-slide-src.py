#!/usr/bin/env python3
"""Contenuti slide dai copioni (FASE 5b): per ogni slide del modulo produce il blocco
visivo che accompagna il parlato — layout, kicker, titolo, lead, punti — nel formato
_slide-src/<corso>-<mNN>-contenuti.json atteso da build-slide.mjs.

Regole vincolanti (verdetti già presi sui corsi precedenti):
  - la slide è SUPPORTO VISIVO, mai la trascrizione del parlato: poche parole, dense;
  - VARIETÀ dei layout: "punti" al massimo un terzo delle slide, il resto distribuito
    su cards, numeri, confronto, flusso, definizione, split, evidenza, timeline, tabella;
  - densità contenuta: l'altezza naturale deve restare sotto ~1100px (invariante anti-taglio);
  - niente simboli decorativi, niente emoji, italiano professionale.

Uso: python scripts/produzione/gen-slide-src.py <corso> [--moduli m01,m02] [--parallel 5]
"""
from __future__ import annotations
import argparse, asyncio, json, re, sys
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import orchestratore as O

REPO = Path(__file__).resolve().parents[2]
PROD = REPO / "produzione"
BLOCCO = 9  # slide per chiamata

LAYOUT = ["apertura", "punti", "cards", "numeri", "confronto", "flusso", "definizione",
          "split", "evidenza", "timeline", "tabella", "chiusura",
          # dati e diagrammi (build-slide.mjs): solo quando il parlato porta davvero quei dati
          "barre", "ciambella", "linee", "matrice", "gantt", "piramide", "ciclo", "organigramma",
          # calcoli svolti e calcolatori del committente: la slide indica la SCHERMATA, i numeri li
          # mette il convertitore da _fonte/calcoli.json
          "calcolo", "simulatore"]

SISTEMA = """Sei il progettista delle slide di un corso video professionale in italiano.
Ogni slide accompagna un relatore che parla: la slide NON ripete il parlato, ne fissa
l'ossatura visiva con poche parole dense che restano impresse.

REGOLE
1. VARIETÀ: usa layout diversi. "punti" non più di un terzo delle slide del blocco.
   Alterna cards, numeri, confronto, flusso, definizione, split, evidenza, timeline, tabella
   e, quando il parlato porta dati o strutture, i grafici e i diagrammi (regola 6).
2. DENSITÀ BASSA: di norma al massimo 4 voci per elenco; ogni voce 3-14 parole. Lead 20-45 parole.
   ECCEZIONE VINCOLANTE: se il parlato CONTA gli elementi (sei definizioni, sette temi, dieci punti),
   la slide li riporta TUTTI, fino a 8, con voci brevi, e il titolo usa lo stesso numero.
   Titolo 4-12 parole. Mai muri di testo: la slide deve restare leggibile a colpo d'occhio.
3. Italiano professionale, niente emoji, niente simboli decorativi, niente punti esclamativi.
4. Il titolo dice la cosa, non la annuncia ("Le quattro condizioni della tassonomia",
   non "Parliamo della tassonomia").
5. I contenuti devono derivare dal parlato di QUELLA slide, mai da altre.
   La PRIMA slide del modulo è sempre "apertura" (punti = 4-5 voci dell'agenda del modulo);
   l'ULTIMA è sempre "chiusura" (punti = 3-4 concetti da portare via, {h,d}).
6. GRAFICI E DIAGRAMMI: usali SOLO se il parlato di quella slide cita quei valori o quella
   struttura; ogni numero del grafico deve essere detto nel parlato (anche in lettere) e, se
   esiste il MATERIALE VISIVO DEL COMMITTENTE, deve coincidere con quello: mai stimare, mai
   arrotondare, mai inventare voci. In dubbio, tabella o numeri. Limiti: barre al massimo 8 voci
   (5 se più serie, massimo 3 serie); ciambella 2-6 voci; linee al massimo 12 periodi e 4 serie;
   matrice al massimo 9 rischi; gantt al massimo 12 periodi e 9 attività; piramide 3-5 livelli;
   ciclo 3-6 nodi; organigramma 2-5 rami con al massimo 4 voci brevi ciascuno.
7. CALCOLI: se il MATERIALE VISIVO DEL COMMITTENTE contiene una schermata di tipo [calc] (calcolo
   svolto) o [sim] (calcolatore interattivo) e il parlato di quella slide SVOLGE quel conto, usa il
   layout "calcolo" o "simulatore" e indica SOLO il numero della schermata: la tabella con dati,
   fattori e risultati viene presa dall'originale, tu NON riscrivi nessun numero. Una schermata
   [calc] vuole "calcolo", una [sim] vuole "simulatore". Se il parlato svolge due conti, scegli
   quello a cui dedica più tempo. Ogni schermata si usa al massimo una volta nel modulo.

FORMATO per slide (JSON):
 apertura:          {id, layout, kicker, titolo, lead, punti:[{h,d}]}   (punti = agenda, 4-5 voci)
 chiusura:          {id, layout, kicker, titolo, lead, punti:[{h,d}]}   (punti OBBLIGATORI: 3-4 concetti da portare via)
 punti/cards:       {id, layout, kicker, titolo, lead, punti:[{h,d}]}
 confronto:         {id, layout, kicker, titolo, lead, colonne:[{h,voci:[...]},{h,voci:[...]}]}
 numeri:            {id, layout, kicker, titolo, lead, numeri:[{n,eti}]}
 flusso/timeline:   {id, layout, kicker, titolo, lead, passi:[{h,d}]}
 definizione:       {id, layout, kicker, titolo, lead, termine, spiegazione}
 split/evidenza:    {id, layout, kicker, titolo, lead, punti:[{h,d}]}
 tabella:           {id, layout, kicker, titolo, lead, intestazioni:[...], righe:[[...]]}
  barre:     {id, layout, kicker, titolo, lead, unita, serie?:[nomi], voci:[{l, v | [v...], obiettivo?, meglioBasso?, max?, u?}], fonte?}
  ciambella: {id, layout, kicker, titolo, lead, unita, totale?:{n, eti}, voci:[{l, v}], fonte?}
  linee:     {id, layout, kicker, titolo, lead, unita, periodi:[...], serie:[{nome, v:[...]}], fonte?}
  matrice:   {id, layout, kicker, titolo, lead, assi?:{x, y}, punti:[{id, l, p, g}]}   (p, g da 1 a 5)
  gantt:     {id, layout, kicker, titolo, lead, periodi:[...], attivita:[{t, da, a, k?}], legenda?:[...]}  (da/a = numero del periodo, da 1)
  piramide:  {id, layout, kicker, titolo, lead, livelli:[{h,d}]}   (dall'alto, il più stretto, al basso)
  ciclo:     {id, layout, kicker, titolo, lead, ciclo: true|false, centro?, nodi:[{h,d}]}  (true = fasi che ripartono, false = elementi attorno a un centro)
  organigramma: {id, layout, kicker, titolo, lead, radice:{h,d}, rami:[{h, d, voci?:[...]}]}
  calcolo/simulatore: {id, layout, kicker, titolo, lead, schermata: N}   (N = numero dopo "SCHERMATA")
Rispondi SOLO con {"slides":[...]}."""


# tipi di schermata del committente che portano DATI o STRUTTURE (vedi _estrai-fonte-pas24000.mjs)
TIPI_VISIVI = ("bar", "gbar", "meters", "funnel", "radar", "donut", "line", "matrix", "gantt",
               "pyramid", "cycle", "hub", "tree", "calc", "sim")


def materiale_visivo(corso: str, mod: str) -> str:
    """Grafici e diagrammi originali del committente per il modulo, con i valori esatti
    (solo per i corsi a fonte HTML che li hanno). Stringa vuota se non ce ne sono."""
    f = PROD / corso / "_fonte" / f"{mod}.txt"
    if not f.exists():
        return ""
    blocchi = re.split(r"(?m)^(?=### SCHERMATA )", f.read_text(encoding="utf-8"))
    visivi = []
    for b in blocchi:
        m = re.match(r"### SCHERMATA \d+ — (.*) \[(\w+)", b)
        if m and m.group(2) in TIPI_VISIVI:
            # il commento del docente non serve al grafico: solo titolo, tipo e dati
            visivi.append("\n".join(r for r in b.strip().splitlines() if not r.startswith("Commento del docente")))
    return "\n\n".join(visivi)


async def genera_modulo(mdl, corso: str, mod: str, slides: list[dict]) -> list[dict]:
    out: list[dict] = []
    materiale = materiale_visivo(corso, mod)
    tutte = sorted(s["id"] for s in json.loads((PROD / corso / "copioni.json").read_text(encoding="utf-8"))["slides"]
                   if s["id"].split("_")[1] == mod)
    primo, ultimo = tutte[0], tutte[-1]
    for i in range(0, len(slides), BLOCCO):
        blocco = slides[i:i + BLOCCO]
        fatti = ", ".join(s["layout"] for s in out[-6:]) or "nessuna"
        utente = (f"Modulo {mod}. Slide {i+1}-{i+len(blocco)} di {len(slides)}.\n"
                  f"Layout delle ultime slide già fatte: {fatti} (varia rispetto a queste).\n\n"
                  + "\n\n".join(f"--- SLIDE {s['id']} · titolo: {s.get('titolo','')}\n"
                                f"PARLATO: {s.get('testo','')[:2600]}" for s in blocco))
        if materiale:
            utente += ("\n\n=== MATERIALE VISIVO DEL COMMITTENTE (grafici e diagrammi originali del modulo, "
                       "valori esatti: usali SOLO per le slide il cui parlato cita quei dati, regola 6) ===\n"
                       + materiale)
        r = await mdl.chiama([{"role": "system", "content": SISTEMA},
                              {"role": "user", "content": utente}],
                             {"type": "json_object"})
        dati = (r if isinstance(r, dict) else json.loads(r))["slides"]
        for s, d in zip(blocco, dati):
            d["id"] = s["id"]                       # l'id è quello canonico, mai inventato
            if d.get("layout") not in LAYOUT: d["layout"] = "punti"
            # apertura in testa e chiusura (riepilogo + prossimo modulo) in coda a OGNI modulo
            if s["id"] == primo: d["layout"] = "apertura"
            elif s["id"] == ultimo: d["layout"] = "chiusura"
            out.append(d)
        print(f"  [{mod}] {len(out)}/{len(slides)} slide")
    return out


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("corso"); ap.add_argument("--moduli"); ap.add_argument("--parallel", type=int, default=5)
    a = ap.parse_args()
    env = O.carica_env(); client = O.client_azure(env)
    cop = json.loads((PROD / a.corso / "copioni.json").read_text(encoding="utf-8"))
    moduli = a.moduli.split(",") if a.moduli else sorted({s["id"].split("_")[1] for s in cop["slides"]})
    dest = PROD / a.corso / "_slide-src"; dest.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(a.parallel)

    async def uno(mod: str):
        f = dest / f"{a.corso}-{mod}-contenuti.json"
        slides = [s for s in cop["slides"] if s["id"].split("_")[1] == mod]
        esistenti = {d["id"]: d for d in json.loads(f.read_text(encoding="utf-8"))} if f.exists() else {}
        if len(esistenti) == len(slides):
            print(f"  [{mod}] già fatto"); return
        # ripresa per SLIDE, non solo per modulo: un corso su nuova edizione parte con i
        # blocchi già pronti delle slide rimaste identiche e fa generare solo le altre.
        mancanti = [s for s in slides if s["id"] not in esistenti]
        async with sem:
            mdl = O.Modello(client, env, {"input": 0, "output": 0, "chiamate": 0})
            dati = await genera_modulo(mdl, a.corso, mod, mancanti)
            esistenti.update({d["id"]: d for d in dati})
            ordinati = [esistenti[s["id"]] for s in slides if s["id"] in esistenti]
            f.write_text(json.dumps(ordinati, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"  [{mod}] SCRITTO {len(ordinati)} slide ({len(dati)} nuove)")

    await asyncio.gather(*(uno(m) for m in moduli))
    print("FATTO")

asyncio.run(main())
