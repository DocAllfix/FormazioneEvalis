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

n_tot = 0
for f in sorted(glob.glob(f"produzione/{CORSO}/_slide-src/*.json")):
    dati = json.load(open(f, encoding="utf-8"))
    mod = re.search(r"-(m\d\d)-", f).group(1)
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
                     "prossimo": f"Modulo {int(mod[1:])+1:02d} — {TITOLI.get(f'm{int(mod[1:])+1:02d}','')}"
                                 if int(mod[1:]) < 10 else "Esame finale"}
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
            base |= {"eyebrow": x.get("kicker", ""), "definizione": (x.get("spiegazione") or x.get("termine") or lead),
                     "punti": p[:4]}
        elif l == "evidenza":
            base |= {"eyebrow": x.get("kicker", ""), "testo": lead, "dark": True}
        elif l == "split":
            base |= {"lead": lead, "punti": p[:4]}
        else:
            base |= {"layout": "punti", "intro": lead, "punti": p[:4]}
        out.append(base)
    json.dump(out, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n_tot += len(out)
    print(f"  {mod}: {len(out)} slide convertite")
print(f"TOTALE: {n_tot} slide nello schema di build-slide")
