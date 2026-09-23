#!/usr/bin/env python3
"""Aggiorna un corso alla NUOVA EDIZIONE della sua norma, slide per slide.

Nasce per 9001 (2015+A1:2024) -> 9001v26 (2026): il catalogo avrà lo stesso caso a ogni
revisione ISO. Principio: l'unità di modifica è la SLIDE INTERA (il labiale non si incolla
a metà), quindi ogni slide o resta identica (e riusa la clip già prodotta) o si riscrive
per intero e si risintetizza.

Ingressi:
  produzione/<vecchio>/copioni.json          copioni dell'edizione precedente
  produzione/<nuovo>/verdetti-slide.md       verdetto per slide: TIENI | LESSICO | RITOCCO | RISCRIVI | NUOVA
  produzione/<nuovo>/clausole-*.json         testo delle clausole vecchia/nuova edizione
  produzione/<nuovo>/struttura.md            skeleton del corso nuovo (per le slide NUOVE)

Uscite:
  produzione/<nuovo>/copioni.json            slides in ordine, id rinumerati
  produzione/<nuovo>/mappa-riuso.json        id nuovo -> id vecchio, verdetto, clip riusabile
  produzione/<nuovo>/_bozze/<mNN>.json       stato incrementale (ripartenza senza rifare)

Uso:
  python scripts/produzione/aggiorna-edizione.py 9001 9001v26 --mappa        # solo mappa+TIENI
  python scripts/produzione/aggiorna-edizione.py 9001 9001v26 --moduli m03   # genera le toccate
  python scripts/produzione/aggiorna-edizione.py 9001 9001v26                # tutti i moduli
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from orchestratore import PROD, REPO, carica_env, client_azure, leggi_json, scrivi_atomico  # noqa: E402

CATEGORIE = ("TIENI", "LESSICO", "RITOCCO", "RISCRIVI", "NUOVA")
RE_IDS = re.compile(r"^-\s+((?:s\d{3}(?:-s\d{3})?(?:,\s*)?)+)\s+(" + "|".join(CATEGORIE) + r")\b:?\s*(.*)$")
RE_NUOVA = re.compile(r"^-\s+NUOVA\s+(m\d\d)\s*(?:\(([^)]*)\))?:?\s*(.*)$")
RE_CLAUSOLA = re.compile(r"\b(\d{1,2}(?:\.\d{1,2}){0,2})\b")

REGOLE_TTS = """REGOLE DI SCRITTURA (la voce sintetica legge questo testo, sono vincolanti):
- ITALIANO PERFETTO, con tutti gli APOSTROFI e gli ACCENTI al loro posto: "dell'organizzazione",
  "l'alta direzione", "c'è", "un'azienda", "perché", "più". Questa è la prima regola: un testo
  con gli apostrofi mancanti ("dell organizzazione") viene buttato e riscritto.
- Prosa continua, nessun elenco puntato, nessun titolo interno, nessun markup.
- Non usare trattini, parentesi, virgolette, slash o altri simboli: la punteggiatura è . , ; : ! ?
- I NUMERI si scrivono IN LETTERE come nel resto del corso: "duemila ventisei", "punto sei punto uno",
  "sesta edizione". Mai cifre, mai "9001:2026".
- MAI gerundi o imperativi con pronome attaccato in -ndoti/-ndomi (preparandoti, chiedendoti,
  basandoti) né riconoscendone, avendone, conoscendone: usare "così ti prepari", "per prepararti",
  "chiedendo a te stesso", "sulla base di".
- Si può scrivere "chiediti" e "domandati" (il glossario li rende a voce "chiedi a te stesso").
- Mai "disciplina" come verbo. Mai citare numeri di paragrafo in cifre: si dice "il punto sei punto uno"."""


# ---------------------------------------------------------------- verdetti
def leggi_verdetti(path: Path) -> tuple[dict, dict]:
    """(verdetti {sid: (categoria, nota)}, nuove {mNN: [(dopo_sid|None, brief)]})."""
    verdetti, nuove, mod = {}, {}, None
    for riga in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^##\s+(M\d+)", riga)
        if m:
            mod = f"m{int(m.group(1)[1:]):02d}"
            continue
        if mod is None:
            continue
        mn = RE_NUOVA.match(riga)
        if mn:
            dove = mn.group(2) or ""
            dopo = re.search(r"dopo\s+(s\d{3})", dove)
            nuove.setdefault(mod, []).append((dopo.group(1) if dopo else None, mn.group(3).strip()))
            continue
        mi = RE_IDS.match(riga)
        if not mi:
            continue
        cat, nota = mi.group(2), mi.group(3).strip()
        for pezzo in mi.group(1).split(","):
            pezzo = pezzo.strip()
            if not pezzo:
                continue
            a, _, b = pezzo.partition("-")
            for n in range(int(a[1:]), int((b or a)[1:]) + 1):
                verdetti[f"{mod}_s{n:03d}"] = (cat, nota)
    return verdetti, nuove


# ---------------------------------------------------------------- mappa del corso nuovo
def costruisci_mappa(vecchio: str, nuovo: str) -> dict:
    cop_v = leggi_json(PROD / vecchio / "copioni.json")
    verdetti, nuove = leggi_verdetti(PROD / nuovo / "verdetti-slide.md")
    per_mod: dict[str, list] = {}
    for s in cop_v["slides"]:
        per_mod.setdefault(s["id"].split("_")[1], []).append(s)

    mappa, ordine = {}, []
    for mod in sorted(per_mod):
        elenco = []
        for s in per_mod[mod]:
            sid_corto = f"{mod}_{s['id'].split('_')[2]}"
            cat, nota = verdetti.get(sid_corto, ("TIENI", ""))
            elenco.append({"vecchio": s["id"], "categoria": cat, "nota": nota,
                           "titolo": s.get("titolo", ""), "parole": len(s["testo"].split())})
            for dopo, brief in nuove.get(mod, []):
                if dopo and s["id"].endswith(dopo):
                    elenco.append({"vecchio": None, "categoria": "NUOVA", "nota": brief,
                                   "titolo": "", "parole": 620})
        for dopo, brief in nuove.get(mod, []):  # NUOVE senza ancora: in coda al blocco
            if dopo is None:
                elenco.insert(len(elenco) - 1, {"vecchio": None, "categoria": "NUOVA",
                                                "nota": brief, "titolo": "", "parole": 620})
        for i, voce in enumerate(elenco, start=1):
            nid = f"{nuovo}_{mod}_s{i:03d}"
            voce["id"] = nid
            mappa[nid] = voce
            ordine.append(nid)
    return {"ordine": ordine, "slide": mappa}


# ---------------------------------------------------------------- contesto per il modello
def clausole_citate(testo: str, nota: str, clausole: dict) -> str:
    """Testo 2026 (e 2015 quando utile) delle clausole nominate nel verdetto."""
    numeri = []
    for n in RE_CLAUSOLA.findall(nota):
        if n in clausole["nuovo"] and n not in numeri:
            numeri.append(n)
    fuori = []
    for n in numeri[:6]:
        blocco = clausole["nuovo"][n]
        corpo = " ".join(blocco) if isinstance(blocco, list) else str(blocco)
        fuori.append(f"### punto {n} — TESTO 2026 (fonte di verità, MAI da copiare)\n{corpo[:2600]}")
        vecchio = clausole["vecchio"].get(n)
        if vecchio:
            corpo_v = " ".join(vecchio) if isinstance(vecchio, list) else str(vecchio)
            fuori.append(f"### punto {n} — testo 2015 (per capire che cosa è cambiato)\n{corpo_v[:1800]}")
    return "\n\n".join(fuori) if fuori else "(nessuna clausola specifica: attieniti al verdetto)"


def prompt_slide(voce: dict, vicini: tuple[str, str], testo_vecchio: str, clausole: str) -> str:
    prec, succ = vicini
    obiettivo = voce["parole"]
    if voce["categoria"] == "NUOVA":
        compito = (f"Scrivi una slide NUOVA su questo argomento della sesta edizione:\n{voce['nota']}\n\n"
                   "Non esiste una versione precedente: la scrivi da zero, nello stile del corso.")
    else:
        compito = (f"Aggiorna la slide alla sesta edizione. VERDETTO DELL'ANALISI: {voce['categoria']} — {voce['nota']}\n\n"
                   f"TESTO ATTUALE DELLA SLIDE (edizione 2015, da aggiornare):\n{testo_vecchio}\n\n"
                   "Cambia SOLO ciò che la nuova edizione rende superato o incompleto: tutto il resto "
                   "(esempi, immagini mentali, ritmo, aperture e chiuse) resta com'è, parola per parola "
                   "dove possibile. Non è una riscrittura di stile: è un aggiornamento di merito.")
    return f"""Sei l'autore dei copioni di Evalis Academy. Stai aggiornando il corso Auditor/Lead Auditor
ISO 9001 alla nuova edizione della norma (sesta edizione, 2026). Il corso esiste già e la voce narrante
è la stessa: il tuo testo deve essere indistinguibile dal resto del corso.

{compito}

## CONTESTO NEL MODULO
Slide precedente, ultime righe: "{prec[-700:] if prec else '(è la prima del modulo)'}"
Slide successiva, prime righe: "{succ[:700] if succ else '(è l ultima del modulo)'}"
La tua slide deve agganciarsi a ciò che viene prima e preparare ciò che viene dopo, come fa il resto del corso.

## LA NORMA 2026
{clausole}

## VINCOLI
- Lunghezza: {obiettivo} parole, tolleranza cinque per cento. È un vincolo di monte ore: rispettalo.
- MAI copiare frasi della norma: almeno otto parole di fila uguali al testo normativo fanno fallire il controllo.
  Spiega con parole tue, come fa il resto del corso.
- Il destinatario è un allievo auditor: si dà del tu, tono professionale e caldo, esempi concreti inventati.
- Non annunciare che la norma è cambiata rispetto a una versione precedente, a meno che il verdetto lo chieda
  esplicitamente: questo è il corso sulla norma vigente, non un corso di aggiornamento.

{REGOLE_TTS}

Rispondi SOLO con un oggetto JSON: {{"titolo": "...", "testo": "..."}}
Il titolo è breve, descrittivo, senza numeri di clausola."""


# ---------------------------------------------------------------- generazione
async def genera_modulo(client, env, vecchio: str, nuovo: str, mod: str, mappa: dict,
                        clausole: dict, cop_v: dict, sem: asyncio.Semaphore) -> None:
    testi_v = {s["id"]: s for s in cop_v["slides"]}
    voci = [mappa["slide"][i] for i in mappa["ordine"] if f"_{mod}_" in i]
    bozza_p = PROD / nuovo / "_bozze" / f"{mod}.json"
    fatto = leggi_json(bozza_p, {}) or {}
    da_fare = [v for v in voci if v["categoria"] != "TIENI" and v["id"] not in fatto]
    if not da_fare:
        print(f"[{mod}] niente da generare ({len(voci)} slide, {sum(1 for v in voci if v['categoria']=='TIENI')} identiche)")
        return
    print(f"[{mod}] {len(da_fare)} slide da scrivere su {len(voci)}")
    async with sem:
        for voce in da_fare:  # sequenziale dentro il modulo: le slide si agganciano tra loro
            i = voci.index(voce)
            def testo_di(k: int) -> str:
                if not (0 <= k < len(voci)):
                    return ""
                v = voci[k]
                if v["id"] in fatto:
                    return fatto[v["id"]]["testo"]
                return testi_v[v["vecchio"]]["testo"] if v["vecchio"] else ""
            testo_vecchio = testi_v[voce["vecchio"]]["testo"] if voce["vecchio"] else ""
            p = prompt_slide(voce, (testo_di(i - 1), testo_di(i + 1)), testo_vecchio,
                             clausole_citate(testo_vecchio, voce["nota"], clausole))
            for tentativo in (1, 2, 3):
                try:
                    r = await client.chat.completions.create(
                        model=env["AZURE_OPENAI_DEPLOYMENT"], max_completion_tokens=6000,
                        response_format={"type": "json_object"},
                        messages=[{"role": "system", "content": "Sei l'autore dei copioni della fabbrica corsi Evalis: rispetti ogni vincolo del messaggio."},
                                  {"role": "user", "content": p}])
                    out = json.loads(r.choices[0].message.content)
                    testo = " ".join(str(out["testo"]).replace("’", "'").split())
                    n = len(testo.split())
                    if abs(n / voce["parole"] - 1) > 0.12 and tentativo < 3:
                        p += f"\n\nATTENZIONE: la stesura precedente aveva {n} parole invece di {voce['parole']}. Riscrivila alla lunghezza richiesta."
                        continue
                    # apostrofi: il modello a volte li omette ("dell organizzazione") perché la
                    # lista bianca del TTS lo mette in guardia sui simboli. In italiano sono
                    # obbligatori: una stesura che ne ha pochissimi è sbagliata, si rifà.
                    if testo.count("'") < n / 60 and tentativo < 3:
                        p += ("\n\nATTENZIONE: la stesura precedente aveva gli APOSTROFI MANCANTI "
                              "(\"dell organizzazione\" invece di \"dell'organizzazione\"). "
                              "Riscrivila in italiano corretto, con tutti gli apostrofi al loro posto.")
                        continue
                    fatto[voce["id"]] = {"titolo": str(out["titolo"]).strip(), "testo": testo,
                                         "parole": n, "categoria": voce["categoria"]}
                    scrivi_atomico(bozza_p, json.dumps(fatto, ensure_ascii=False, indent=1) + "\n")
                    print(f"  [{voce['id']}] {voce['categoria']:8} {n} parole (obiettivo {voce['parole']})")
                    break
                except Exception as e:
                    if tentativo == 3:
                        print(f"  [{voce['id']}] FALLITA: {type(e).__name__} {e}")
                    await asyncio.sleep(3 * tentativo)


def monta_copioni(vecchio: str, nuovo: str, mappa: dict) -> None:
    """copioni.json del corso nuovo: TIENI verbatim + bozze generate, nell'ordine."""
    cop_v = leggi_json(PROD / vecchio / "copioni.json")
    testi_v = {s["id"]: s for s in cop_v["slides"]}
    cop_n = leggi_json(PROD / nuovo / "copioni.json")
    bozze = {}
    for p in sorted((PROD / nuovo / "_bozze").glob("m*.json")):
        bozze.update(leggi_json(p, {}) or {})
    slides, mancanti = [], []
    for nid in mappa["ordine"]:
        voce = mappa["slide"][nid]
        if voce["categoria"] == "TIENI":
            v = testi_v[voce["vecchio"]]
            slides.append({"id": nid, "titolo": v.get("titolo", ""), "testo": v["testo"]})
        elif nid in bozze:
            slides.append({"id": nid, "titolo": bozze[nid]["titolo"], "testo": bozze[nid]["testo"]})
        else:
            mancanti.append(nid)
    cop_n["slides"] = slides
    scrivi_atomico(PROD / nuovo / "copioni.json", json.dumps(cop_n, ensure_ascii=False, indent=2) + "\n")
    parole = sum(len(s["testo"].split()) for s in slides)
    print(f"copioni {nuovo}: {len(slides)} slide · {parole} parole · ~{parole/2.35/60:.0f} min"
          + (f" · MANCANTI {len(mancanti)}: {mancanti[:5]}" if mancanti else ""))


async def main() -> None:
    ap = argparse.ArgumentParser(description="Aggiorna un corso alla nuova edizione della norma")
    ap.add_argument("vecchio"); ap.add_argument("nuovo")
    ap.add_argument("--moduli", help="es. m03,m04 (default: tutti)")
    ap.add_argument("--mappa", action="store_true", help="solo mappa di riuso e slide identiche")
    ap.add_argument("--parallel", type=int, default=4)
    a = ap.parse_args()

    mappa_p = PROD / a.nuovo / "mappa-riuso.json"
    mappa = costruisci_mappa(a.vecchio, a.nuovo)
    scrivi_atomico(mappa_p, json.dumps(mappa, ensure_ascii=False, indent=1) + "\n")
    conta = {}
    for v in mappa["slide"].values():
        conta[v["categoria"]] = conta.get(v["categoria"], 0) + 1
    print(f"mappa: {len(mappa['ordine'])} slide · {conta}")

    if a.mappa:
        monta_copioni(a.vecchio, a.nuovo, mappa); return

    clausole = leggi_json(PROD / a.nuovo / "clausole-2015-2026.json")
    cop_v = leggi_json(PROD / a.vecchio / "copioni.json")
    env = carica_env()
    client = client_azure(env)
    moduli = a.moduli.split(",") if a.moduli else sorted({i.split("_")[1] for i in mappa["ordine"]})
    sem = asyncio.Semaphore(a.parallel)
    t0 = time.time()
    await asyncio.gather(*(genera_modulo(client, env, a.vecchio, a.nuovo, m, mappa, clausole, cop_v, sem)
                           for m in moduli))
    print(f"\ngenerazione in {round(time.time()-t0)}s")
    monta_copioni(a.vecchio, a.nuovo, mappa)


if __name__ == "__main__":
    asyncio.run(main())
