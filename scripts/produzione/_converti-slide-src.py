# Rimappa i contenuti slide generati nello schema ESATTO atteso da build-slide.mjs
# (verificato sui corsi già in produzione: fadai02 e 19011).
import json, glob, sys, re
sys.stdout.reconfigure(encoding="utf-8")

CORSO = sys.argv[1] if len(sys.argv) > 1 else "fadesg02"
# Etichetta mostrata nell'intestazione delle slide di apertura. ERA SCRITTA A MANO e, riusando
# lo script sul secondo corso, ha marchiato 11 slide Energy come "ESG Manager" (02/08/2026).
ETICHETTA = {
    "fadesg02": "ESG Manager · UNI/PdR 109.1",
    "fadeen02": "Energy Manager · UNI CEI 11339",
    "fadpdr125": "Parità di genere · UNI/PdR 125:2022",
    "fadpas24000": "Sistema di gestione sociale · PAS 24000:2022",
}
if CORSO not in ETICHETTA:
    raise SystemExit(f"Etichetta di corso mancante per {CORSO}: aggiungerla a ETICHETTA prima di convertire.")
TITOLI = {}  # mNN -> titolo modulo, dallo skeleton
for r in open(f"produzione/{CORSO}/struttura.md", encoding="utf-8"):
    m = re.match(r"\|\s*M(\d+)\s*\|([^|]+)\|", r)
    if m: TITOLI[f"m{int(m.group(1)):02d}"] = m.group(2).strip()

def voci(x, *chiavi):
    for k in chiavi:
        v = x.get(k)
        if isinstance(v, list) and v: return v
    return []

def hd(v):
    "normalizza una voce in {h,d}"
    if isinstance(v, dict):
        return {"h": str(v.get("h") or v.get("titolo") or v.get("n") or "").strip(),
                "d": str(v.get("d") or v.get("testo") or v.get("eti") or v.get("descrizione") or "").strip()}
    return {"h": "", "d": str(v).strip()}

def numero(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def grafico(l, x):
    """Controlla la forma dei layout di DATI e DIAGRAMMI di build-slide.mjs e la normalizza.
    Ritorna (campi, None) se valido, (None, motivo) se no: in quel caso la slide diventa una
    tabella con gli stessi dati, così nessun contenuto si perde e nessun grafico mente."""
    t = lambda v: str(v or "").strip()
    if l == "barre":
        vv = x.get("voci") or []
        serie = [t(s) for s in (x.get("serie") or [])]
        nser = max(1, len(serie))
        if not 1 <= len(vv) <= (5 if nser > 1 else 8) or nser > 3: return None, "barre: numero di voci o serie fuori limite"
        voci = []
        for v in vv:
            vals = v.get("v") if isinstance(v.get("v"), list) else [v.get("v")]
            if len(vals) != nser or not all(numero(z) and z >= 0 for z in vals): return None, f"barre: valori non numerici o serie incoerenti ({t(v.get('l'))})"
            o = {"l": t(v.get("l")), "v": vals if nser > 1 else vals[0]}
            if numero(v.get("obiettivo")): o |= {"obiettivo": v["obiettivo"], "meglioBasso": bool(v.get("meglioBasso"))}
            if numero(v.get("max")): o["max"] = v["max"]
            if v.get("u") is not None: o["u"] = t(v.get("u"))
            voci.append(o)
        return {"unita": t(x.get("unita")), **({"serie": serie} if nser > 1 else {}), "voci": voci}, None
    if l == "ciambella":
        vv = x.get("voci") or []
        if not 2 <= len(vv) <= 6 or not all(numero(v.get("v")) and v["v"] > 0 for v in vv): return None, "ciambella: servono 2-6 voci con valori positivi"
        tot = x.get("totale") if isinstance(x.get("totale"), dict) else None
        return {"unita": t(x.get("unita")), **({"totale": {"n": t(tot.get("n")), "eti": t(tot.get("eti"))}} if tot else {}),
                "voci": [{"l": t(v.get("l")), "v": v["v"]} for v in vv]}, None
    if l == "linee":
        per, ser = x.get("periodi") or [], x.get("serie") or []
        if not 2 <= len(per) <= 12 or not 1 <= len(ser) <= 4: return None, "linee: periodi o serie fuori limite"
        if not all(len(s.get("v") or []) == len(per) and all(numero(z) for z in s["v"]) for s in ser): return None, "linee: serie di lunghezza diversa dai periodi"
        return {"unita": t(x.get("unita")), "periodi": [t(p) for p in per], "serie": [{"nome": t(s.get("nome")), "v": s["v"]} for s in ser]}, None
    if l == "matrice":
        pp = x.get("punti") or []
        if not 1 <= len(pp) <= 9 or not all(isinstance(p.get("p"), int) and isinstance(p.get("g"), int) and 1 <= p["p"] <= 5 and 1 <= p["g"] <= 5 for p in pp):
            return None, "matrice: servono 1-9 rischi con probabilità e gravità intere da 1 a 5"
        a = x.get("assi") if isinstance(x.get("assi"), dict) else {}
        return {"assi": {"x": t(a.get("x")) or "Probabilità", "y": t(a.get("y")) or "Gravità"},
                "punti": [{"id": t(p.get("id")), "l": t(p.get("l")), "p": p["p"], "g": p["g"]} for p in pp]}, None
    if l == "gantt":
        per, att = x.get("periodi") or [], x.get("attivita") or []
        if not 2 <= len(per) <= 12 or not 1 <= len(att) <= 9: return None, "gantt: periodi o attività fuori limite"
        if not all(isinstance(a.get("da"), int) and isinstance(a.get("a"), int) and 1 <= a["da"] <= a["a"] <= len(per) for a in att):
            return None, "gantt: inizio e fine devono essere periodi esistenti, con inizio ≤ fine"
        return {"periodi": [t(p) for p in per], **({"legenda": [t(z) for z in x["legenda"]]} if x.get("legenda") else {}),
                "attivita": [{"t": t(a.get("t")), "da": a["da"], "a": a["a"], "k": int(a.get("k") or 1)} for a in att]}, None
    if l == "piramide":
        lv = [hd(v) for v in (x.get("livelli") or [])]
        if not 3 <= len(lv) <= 5: return None, "piramide: servono 3-5 livelli"
        return {"livelli": lv}, None
    if l == "ciclo":
        nd = [hd(v) for v in (x.get("nodi") or [])]
        if not 3 <= len(nd) <= 6: return None, "ciclo: servono 3-6 nodi"
        return {"ciclo": bool(x.get("ciclo")), "centro": t(x.get("centro")), "nodi": nd}, None
    if l == "organigramma":
        r, rami = x.get("radice"), x.get("rami") or []
        if not isinstance(r, dict) or not 2 <= len(rami) <= 5: return None, "organigramma: servono una radice e 2-5 rami"
        return {"radice": hd(r), "rami": [hd(z) | {"voci": [t(v) for v in (z.get("voci") or [])][:4]} for z in rami]}, None
    return None, f"layout sconosciuto {l}"


def tabella_da(x):
    "ripiego: i dati di un grafico malformato diventano righe di tabella, senza perdite"
    ETICHETTE = ("l", "id", "t", "h", "nome")
    righe = []
    for k in ("voci", "punti", "attivita", "livelli", "nodi", "rami", "serie"):
        for v in (x.get(k) or []):
            if isinstance(v, dict):
                nome = next((str(v[c]) for c in ETICHETTE if v.get(c) is not None), "")
                # tutti gli altri campi, così il dato resta visibile anche se la forma era sbagliata
                dati = [f"{c} {', '.join(map(str, z)) if isinstance(z, list) else z}"
                        for c, z in v.items() if c not in ETICHETTE and z not in (None, "", [])]
                righe.append([nome, " · ".join(dati)])
    return {"cols": ["Voce", "Dato"], "righe": righe[:6]}


GRAFICI = ("barre", "ciambella", "linee", "matrice", "gantt", "piramide", "ciclo", "organigramma")
ripieghi = 0
n_tot = 0
# --moduli m01,m07: converte SOLO quei moduli. Il convertitore riscrive i file sul posto e non è
# idempotente: riconvertire un modulo già convertito ne altererebbe apertura e agenda.
MODULI = sys.argv[sys.argv.index("--moduli") + 1].split(",") if "--moduli" in sys.argv else None
for f in sorted(glob.glob(f"produzione/{CORSO}/_slide-src/*.json")):
    mod = re.search(r"-(m\d\d)-", f).group(1)
    if MODULI and mod not in MODULI:
        continue
    dati = json.load(open(f, encoding="utf-8"))
    out = []
    for i, x in enumerate(dati):
        l = x.get("layout", "punti")
        base = {"id": x["id"], "layout": l, "kicker": (x.get("kicker") or "").strip(),
                "titolo": (x.get("titolo") or "").strip()}
        lead = (x.get("lead") or x.get("intro") or "").strip()
        p = [hd(v) for v in voci(x, "punti", "passi", "cards", "voci")]
        if l == "apertura":
            base |= {"corsoLabel": ETICHETTA[CORSO], "eyebrow": x.get("kicker", ""),
                     "sottotitolo": lead, "agenda": [v["h"] or v["d"] for v in p][:5] or
                     [s.get("titolo","") for s in dati[1:6]]}
        elif l == "chiusura":
            base |= {"modNum": mod[1:], "punti": p[:4],
                     # build-slide vuole {modulo, titolo}: con una stringa la slide mostrava
                     # "Prossimo → Modulo —" vuoto (ESG ed Energy, scoperto il 05/10/2026).
                     # Ultimo modulo (dallo skeleton, non fisso a 10): niente riquadro.
                     "prossimo": {"modulo": f"{int(mod[1:])+1:02d}", "titolo": TITOLI[f"m{int(mod[1:])+1:02d}"]}
                                 if f"m{int(mod[1:])+1:02d}" in TITOLI else None}
        elif l == "confronto":
            col = x.get("colonne") or []
            def lato(c, fallback_h):
                if isinstance(c, dict):
                    vv = [hd(v) for v in voci(c, "voci", "punti")]
                    return {"h": (c.get("h") or fallback_h)[:60], "sub": (c.get("sub") or "").strip(),
                            "punti": [{"d": v["d"] or v["h"]} for v in vv][:4]}
                return {"h": fallback_h, "sub": "", "punti": []}
            a = lato(col[0] if len(col) > 0 else x.get("a"), "Da una parte")
            b = lato(col[1] if len(col) > 1 else x.get("b"), "Dall'altra")
            if not a["punti"] and p: a["punti"] = [{"d": v["d"]} for v in p[:2]]
            if not b["punti"] and len(p) > 2: b["punti"] = [{"d": v["d"]} for v in p[2:4]]
            base |= {"intro": lead, "a": a, "b": b}
        elif l == "numeri":
            nn = x.get("numeri") or []
            out_n = []
            for j, v in enumerate(nn[:4], 1):
                if isinstance(v, dict):
                    out_n.append({"n": str(v.get("n") or j), "h": (v.get("h") or v.get("eti") or "").strip(),
                                  "d": (v.get("d") or v.get("eti") or "").strip()})
            if not out_n: out_n = [{"n": str(j), "h": v["h"], "d": v["d"]} for j, v in enumerate(p[:4], 1)]
            # una sola frase dal generatore = solo titolo: con h == d la slide la mostrerebbe due
            # volte (titolo in grassetto + stessa riga in grigio). Difetto visto su ESG/Energy.
            for v in out_n:
                if v["d"] == v["h"]: v["d"] = ""
            base |= {"intro": lead, "numeri": out_n}
        elif l == "flusso":
            base |= {"intro": lead, "passi": p[:5]}
        elif l == "timeline":
            base |= {"intro": lead, "tappe": [{"t": f"{j:02d}", "h": v["h"], "d": v["d"]}
                                              for j, v in enumerate(p[:5], 1)]}
        elif l == "cards":
            base |= {"intro": lead, "cards": p[:4]}
        elif l == "tabella":
            cols = x.get("intestazioni") or x.get("cols") or []
            righe = [[str(c) for c in r] for r in (x.get("righe") or []) if isinstance(r, list)]
            if not cols and righe: cols = [f"Colonna {i+1}" for i in range(len(righe[0]))]
            base |= {"cols": cols[:4], "righe": [r[:4] for r in righe[:6]]}
        elif l == "definizione":
            # niente eyebrow uguale al kicker: in testa alla slide la parola comparirebbe due volte
            base |= {"eyebrow": "", "definizione": (x.get("spiegazione") or x.get("termine") or lead),
                     "punti": p[:4]}
        elif l == "evidenza":
            base |= {"eyebrow": "", "testo": lead, "dark": True}
        elif l == "split":
            base |= {"lead": lead, "punti": p[:4]}
        elif l in GRAFICI:
            campi, motivo = grafico(l, x)
            if campi:
                base |= {"intro": lead, **campi, **({"fonte": x["fonte"].strip()} if x.get("fonte") else {})}
            else:
                ripieghi += 1
                print(f"  ! {x['id']}: {motivo} → tabella con gli stessi dati")
                base |= {"layout": "tabella", **tabella_da(x)}
        else:
            base |= {"layout": "punti", "intro": lead, "punti": p[:4]}
        out.append(base)
    json.dump(out, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n_tot += len(out)
    print(f"  {mod}: {len(out)} slide convertite")
print(f"TOTALE: {n_tot} slide nello schema di build-slide · grafici ripiegati su tabella: {ripieghi}")
