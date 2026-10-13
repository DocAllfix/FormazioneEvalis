# Riporta nel corso i calcolatori interattivi «Prova tu» del committente che il generatore non ha usato,
# SOLO dove il parlato li giustifica (la slide deve restare coerente con il suo audio).
# Per ogni calcolatore mancante un giudice legge il parlato delle slide del modulo e indica la slide che
# tratta QUEL conto (stesse voci, stesso scenario) con una citazione letterale; lo script controlla che la
# citazione esista in quella slide. Si sostituisce solo una slide che non sia apertura, chiusura o già
# calcolatore; se la slide è un calcolo svolto, deve riguardare le stesse voci (altrimenti si perderebbe
# il conto che l'audio racconta). Titolo e introduzione restano quelli scritti sul parlato; i dati del
# calcolatore vengono dalla fonte (_fonte/calcoli.json). Senza --scrivi stampa soltanto le proposte.
# Uso: python scripts/produzione/_aggiungi-simulatori.py <corso> [--scrivi]
import asyncio, json, os, re, sys
from pathlib import Path
sys.path.insert(0, "scripts/produzione")
sys.stdout.reconfigure(encoding="utf-8")
import orchestratore as O

corso, scrivi = sys.argv[1], "--scrivi" in sys.argv
base = Path(f"produzione/{corso}")
cal = json.loads((base / "_fonte" / "calcoli.json").read_text(encoding="utf-8"))
cop = {s["id"]: s for s in json.loads((base / "copioni.json").read_text(encoding="utf-8"))["slides"]}
norm = lambda t: re.sub(r"\s+", " ", re.sub(r"[^\wà-ù ]", " ", t.lower())).strip()
VUOTE = set("di del della dei degli delle e il la lo i gli le un una in per con da a al alla su sul nel nella o".split())
parole = lambda t: {w for w in re.findall(r"[a-zà-ù0-9]+", t.lower()) if len(w) > 3 and w not in VUOTE}

ISTRUZIONI = """Lavori su un corso video: ogni slide ha un parlato. Ti do un CALCOLATORE interattivo (voci, fattori,
valori di esempio) e il parlato di tutte le slide di un modulo. Indica la slide il cui parlato tratta proprio
QUEL conto: stesse voci o stesso scenario, in modo che mostrando il calcolatore su quella slide chi ascolta
veda ciò di cui si sta parlando. Non basta un tema vicino: se nessuna slide tratta quel conto, rispondi null.
Riporta una CITAZIONE letterale (10-25 parole, copiata esattamente) dal parlato di quella slide che lo prova.
Rispondi SOLO in JSON: {"slide": "id" | null, "citazione": "...", "motivo": "..."}"""


async def main():
    env = O.carica_env(); mdl = O.Modello(O.client_azure(env), env, {"input": 0, "output": 0, "chiamate": 0})
    file_mod = {m: base / "_slide-src" / f"{corso}-{m}-contenuti.json" for m in cal}
    slide_mod = {m: json.loads(f.read_text(encoding="utf-8")) for m, f in file_mod.items()}
    lavori = []
    for m in sorted(cal):
        presenti = [json.dumps(x.get("righe"), sort_keys=True) for x in slide_mod[m] if x["layout"] == "simulatore"]
        for n, sim in sorted(cal[m].items(), key=lambda kv: int(kv[0])):
            if sim["tipo"] == "simulatore" and json.dumps(sim["righe"], sort_keys=True) not in presenti:
                lavori.append((m, n, sim))

    async def uno(m, n, sim):
        testo = "\n\n".join(f"### {x['id']} — {cop[x['id']]['titolo']}\n{cop[x['id']]['testo']}" for x in slide_mod[m])
        descr = json.dumps({"titolo": sim["titolo"], "voci": [{k: r[k] for k in ("l", "v", "u", "ef", "efu")} for r in sim["righe"]],
                            "nota": sim.get("piede", "")}, ensure_ascii=False)
        r = await mdl.chiama([{"role": "system", "content": ISTRUZIONI},
                              {"role": "user", "content": f"CALCOLATORE:\n{descr}\n\nPARLATO DEL MODULO {m}:\n{testo}"}],
                             {"type": "json_object"}, max_tokens=16000)
        return m, n, sim, r

    esiti = await asyncio.gather(*(uno(*l) for l in lavori))
    fatti, usate = 0, set()
    for m, n, sim, r in esiti:
        sid = r.get("slide")
        x = next((v for v in slide_mod[m] if v["id"] == sid), None)
        motivo = None
        if not x: motivo = "nessuna slide tratta questo conto"
        elif norm(r.get("citazione", "")) not in norm(cop[sid]["testo"]) or len(norm(r.get("citazione", ""))) < 30:
            motivo = "citazione non trovata nel parlato"
        elif x["layout"] in ("apertura", "chiusura", "simulatore") or sid in usate:
            motivo = f"slide non sostituibile ({x['layout']})"
        elif x["layout"] == "calcolo":
            # il calcolo a schermo deve essere CONTENUTO nel calcolatore: ogni sua riga (dato e fattore)
            # compare fra i valori di esempio, così la versione interattiva mostra lo stesso conto dell'audio
            coppie = {(round(z["v"], 6), round(z["ef"], 6)) for z in sim["righe"]}
            if not all((round(z["a"], 6), round(z["ef"], 6)) in coppie and z.get("k") is None and z.get("d") is None for z in x["righe"]):
                motivo = "la slide è un calcolo su voci diverse: sostituirla toglierebbe il conto raccontato dall'audio"
        print(f"[{m} sch.{n}] «{sim['titolo']}» → {sid} ({x['layout'] if x else '-'}) · "
              + ("OK" if not motivo else f"SCARTATO: {motivo}") + f"\n      «{r.get('citazione', '')[:150]}»")
        if motivo: continue
        usate.add(sid); fatti += 1
        if scrivi:
            for k in [k for k in x if k not in ("id", "kicker", "titolo", "intro", "lead")]: x.pop(k)
            x.update(layout="simulatore", unita=sim.get("unita"), righe=sim["righe"], _schermata=n,
                     **({"piede": sim["piede"]} if sim.get("piede") and len(sim["piede"]) <= 170 else {}),
                     **({"fonte": sim["fonte"]} if sim.get("fonte") else {}))
            if not x.get("intro"): x["intro"] = x.pop("lead", "") or sim["titolo"]
    if scrivi:
        for m, f in file_mod.items():
            f.with_suffix(".tmp").write_text(json.dumps(slide_mod[m], ensure_ascii=False, indent=1), encoding="utf-8")
            os.replace(f.with_suffix(".tmp"), f)
    print(f"{fatti} calcolatori " + ("aggiunti" if scrivi else "proponibili (prova: nulla scritto; --scrivi per applicare)"))

asyncio.run(main())
