# Fedeltà dei NUMERI del parlato alla fonte del committente (corsi a fonte HTML con molti conti).
# I copioni scrivono i numeri in lettere ("ventunomilaseicentonovantadue virgola cinque"): qui si
# rileggono come valori e si cerca ciascuno fra i numeri della fonte del modulo (_fonte/mNN.txt).
# STADIO 1 (stretto): il valore coincide con un numero della fonte, con un suo arrotondamento alle
# cifre dette, o con una conversione per mille (chili e tonnellate, chilowattora e megawattora).
# STADIO 2 (--giudice): per ogni numero rimasto un modello deve indicare l'ESPRESSIONE che lo produce
# dai numeri della fonte; lo script controlla che gli operandi esistano nella fonte e rifà il conto.
# Ciò che resta senza prova verificata va LETTO A MANO (anche in _numeri-da-leggere.json).
# Nota di progetto: una prima versione accettava "somma, prodotto o rapporto di due numeri qualsiasi
# del modulo" e lasciava passare quasi ogni numero a caso (provato): per questo la prova è esplicita.
# Si controllano i valori "che contano": con la virgola, oppure da 13 in su (sotto, il parlato è
# pieno di "due metodi" e "tre passi" che non sono dati).
# Uso: python scripts/produzione/_numeri-parlato.py <corso> [mNN ...] [--bozze] [--giudice]
#      (default: copioni.json; --bozze legge _bozze/mNN.json)
import asyncio, json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")

UNITA = {"zero": 0, "uno": 1, "un": 1, "una": 1, "due": 2, "tre": 3, "tré": 3, "quattro": 4, "cinque": 5, "sei": 6,
         "sette": 7, "otto": 8, "nove": 9, "dieci": 10, "undici": 11, "dodici": 12, "tredici": 13,
         "quattordici": 14, "quindici": 15, "sedici": 16, "diciassette": 17, "diciotto": 18, "diciannove": 19}
DECINE = {"venti": 20, "trenta": 30, "quaranta": 40, "cinquanta": 50, "sessanta": 60, "settanta": 70,
          "ottanta": 80, "novanta": 90}
GRANDI = {"milione": 10**6, "milioni": 10**6, "miliardo": 10**9, "miliardi": 10**9}


def sotto_cento(w: str):
    if w == "": return 0
    if w in UNITA: return UNITA[w]
    for d, v in DECINE.items():
        for radice in (d, d[:-1]):                      # "vent" + "uno", "trent" + "otto"
            if w.startswith(radice):
                r = w[len(radice):]
                if r == "": return v if radice == d else None
                if r in UNITA and 1 <= UNITA[r] <= 9 and r not in ("un", "una"): return v + UNITA[r]
    return None


def sotto_mille(w: str):
    if "cento" in w:
        a, b = w.split("cento", 1)
        c = 1 if a == "" else UNITA.get(a)
        if c is None or not 1 <= c <= 9: return None
        r = sotto_cento(b)
        if r is None: r = sotto_cento("o" + b)          # "centottanta", "centotto": la o è una sola
        return None if r is None else c * 100 + r
    return sotto_cento(w)


def parola(w: str):
    "valore di UNA parola-numero composta (fino a 999.999), None se non è un numero"
    w = w.lower()
    if w == "mille": return 1000
    if w.startswith("mille"):
        r = sotto_mille(w[5:])
        return None if r is None else 1000 + r
    if "mila" in w:
        a, b = w.rsplit("mila", 1)
        x, y = sotto_mille(a), sotto_mille(b)
        return None if x is None or y is None or x < 2 else x * 1000 + y
    return sotto_mille(w)


TOKEN = re.compile(r"[a-zà-ù]+", re.I)
# parola fatta di cifre incollate ("settezerozerosei"): non è un numero italiano e la voce la storpia
CIFRE_INCOLLATE = re.compile(r"^(?:zero|uno|due|tre|quattro|cinque|sei|sette|otto|nove){2,}$", re.I)


def incollato(w: str) -> bool:
    "un numero con una cifra attaccata in coda (\"duecentotrentaquattrosette\"): la voce lo storpia"
    w = w.lower()
    return any(parola(w[:i]) is not None and w[i:] in UNITA and UNITA[w[i:]] <= 9 and len(w[:i]) > 4
               for i in range(5, len(w) - 1))


def zeri_finali(n: int) -> int:
    z = 0
    while n and n % 10 == 0:
        n //= 10; z += 1
    return z


def numeri_del_testo(testo: str):
    """→ [(valore, decimali detti, frammento, avviso)] per ogni numero in lettere del testo.
    Legge anche i numeri scritti a parole staccate ("mille novecento ottantaquattro") e i decimali
    detti cifra per cifra ("virgola zero sette nove"), che sono parlato corretto. L'avviso segnala solo
    ciò che la voce storpia: cifre incollate in una parola e decimali misti."""
    toks = [(m.group(0).lower(), m.start(), m.end()) for m in TOKEN.finditer(testo)]
    # due parole fanno parte dello stesso numero solo se fra loro c'è soltanto spazio (mai un punto)
    attaccato = lambda k: k > 0 and testo[toks[k - 1][2]:toks[k][1]].strip() == ""
    out, i = [], 0
    while i < len(toks):
        w = toks[i][0]
        if parola(w) is None and (CIFRE_INCOLLATE.match(w) or incollato(w)):
            out.append((float("nan"), 0, w, "cifre incollate in una parola sola")); i += 1; continue
        v = parola(w)
        dopo = toks[i + 1][0] if i + 1 < len(toks) else ""
        # "un", "una", "uno" sono quasi sempre articoli: contano solo davanti a milione o a virgola
        per_cento = w == "cento" and i > 0 and toks[i - 1][0] == "per"
        if v is None or per_cento or (w in ("un", "una", "uno") and dopo not in GRANDI and dopo != "virgola"):
            i += 1; continue
        ini, tot, j, avviso = toks[i][1], 0, i, ""
        # parte intera: [n milioni] [e] poi parole che si compongono (mille + novecento + ottantaquattro)
        while j < len(toks):
            if j > i and not attaccato(j): break
            # "duecentosettantasettemila e ottocento": la e lega due pezzi dello stesso numero
            if (j > i and toks[j][0] == "e" and j + 1 < len(toks) and attaccato(j + 1) and tot > 0
                    and parola(toks[j + 1][0]) is not None and 0 < parola(toks[j + 1][0]) < 10 ** zeri_finali(int(tot))
                    and zeri_finali(int(tot)) >= 3):
                j += 1
            x = parola(toks[j][0])
            if x is None or toks[j][0] in ("un", "una") and j > i: break
            # "cinquanta mila", "cinque mila settecento": mila staccato moltiplica il pezzo appena letto
            if j + 1 < len(toks) and toks[j + 1][0] == "mila" and attaccato(j + 1) and 2 <= x <= 999:
                if j > i and not (tot > 0 and x * 1000 < 10 ** zeri_finali(int(tot))): break
                tot += x * 1000; j += 2
                continue
            if j + 1 < len(toks) and toks[j + 1][0] in GRANDI:
                tot += x * GRANDI[toks[j + 1][0]]; j += 2
                if j < len(toks) and toks[j][0] == "e" and j + 1 < len(toks) and parola(toks[j + 1][0]) is not None: j += 1
                continue
            if j > i and not (tot > 0 and 0 < x < 10 ** zeri_finali(int(tot))): break
            tot += x; j += 1
        dec = 0
        if j < len(toks) and toks[j][0] == "virgola" and attaccato(j):
            cifre, k = "", j + 1
            while k < len(toks) and k - j <= 5 and attaccato(k) and parola(toks[k][0]) is not None and toks[k][0] not in ("un", "una"):
                cifre += str(parola(toks[k][0])); k += 1
            if k < len(toks) and attaccato(k) and parola(toks[k][0]) is None and (CIFRE_INCOLLATE.match(toks[k][0]) or incollato(toks[k][0])):
                avviso = "decimali con cifre incollate"; k += 1; j = k
            # cifra per cifra ("zero sei due cinque") va bene; un numero seguito da altre cifre no
            pezzi = [parola(t[0]) for t in toks[j + 1:k]]
            if len([x for x in pezzi if x != 0]) > 1 and any(x >= 10 for x in pezzi):
                avviso = "decimali misti (un numero seguito da altre cifre)"
            if cifre:
                tot += int(cifre) / 10 ** len(cifre); dec = len(cifre); j = k
        out.append((tot, dec, testo[ini:toks[j - 1][2]], avviso))
        i = max(j, i + 1)
    return out


def numeri_della_fonte(testo: str):
    vals = set()
    for m in re.finditer(r"(?<![\w,.])\d{1,3}(?:\.\d{3})+(?:,\d+)?|(?<![\w,.])\d+(?:,\d+)?", testo):
        vals.add(float(m.group(0).replace(".", "").replace(",", ".")))
    return vals


def stretto(v: float, dec: int, F: set) -> str | None:
    "STADIO 1: il valore è nella fonte, o ne è un arrotondamento, o una conversione per mille"
    passo = 10 ** -dec
    vicino = lambda x: abs(x - v) <= passo / 2 + 1e-9          # x arrotondato alle cifre dette dà v
    if any(abs(v - f) <= max(1e-9, abs(f) * 1e-6) for f in F): return "fonte"
    if any(vicino(f) for f in F): return "arrotondamento"
    if any(vicino(f / 1000) or vicino(f * 1000) for f in F): return "conversione per mille"
    return None


# STADIO 2: il giudice deve PROVARE il numero con un'espressione sui numeri della fonte.
# Lo script non gli crede: controlla che ogni operando sia davvero nella fonte e rifà il conto.
ISTRUZIONI = """Sei un revisore contabile di un corso sul calcolo delle emissioni. Ti do la FONTE del modulo
(con tutti i numeri ufficiali) e un elenco di NUMERI detti a voce dal relatore, ciascuno col suo contesto.
Per ogni numero devi dire da dove viene, con un'espressione aritmetica che usa SOLO numeri scritti nella
fonte (più le costanti 100 e 1000 per percentuali e conversioni, e piccoli interi da 1 a 12 quando il
relatore conta o moltiplica per un numero di unità). Operatori ammessi: + - * / e parentesi.
Scrivi i numeri col punto decimale e senza separatore delle migliaia (21692.5, non 21.692,5).
Se il numero è un'approssimazione dichiarata dal relatore (circa, quasi, poco più di), l'espressione dà il
valore esatto e metti "tondo": true.
Se il numero NON è ricavabile dalla fonte (è inventato, o è un dato esterno che la fonte non riporta),
metti "espressione": null e spiega in "motivo". Non forzare: un null onesto vale più di un conto di comodo.
Rispondi SOLO in formato JSON, con {"numeri":[{"n": indice, "espressione": "..."|null, "tondo": true|false, "motivo": "..."}]}."""

ESPR = re.compile(r"^[\d.\s+\-*/()]+$")


def verifica_prova(v: float, dec: int, espr, tondo: bool, F: set) -> str | None:
    "None se la prova regge, altrimenti il motivo per cui non regge"
    if not espr or not ESPR.match(espr): return "nessuna espressione valida"
    operandi = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", espr)]
    fuori = [x for x in operandi if not (any(abs(x - f) <= max(1e-9, abs(f) * 1e-6) for f in F)
                                         or x in (100, 1000) or (x == int(x) and 1 <= x <= 12))]
    if fuori: return f"operandi che non sono nella fonte: {fuori}"
    try:
        r = eval(espr, {"__builtins__": {}}, {})          # solo cifre e operatori: lo garantisce ESPR
    except Exception as e:
        return f"espressione non calcolabile ({e})"
    passo = 10 ** -dec
    if abs(r - v) <= passo / 2 + 1e-9: return None
    if tondo and v and abs(r - v) / abs(v) <= 0.05: return None      # «circa»: entro il 5%
    return f"l'espressione dà {r:g}, il parlato dice {v:g}"


async def giudica(mdl, fonte: str, casi: list[dict]) -> dict:
    elenco = "\n".join(f"{i}. valore {c['v']:g} — «{c['contesto']}»" for i, c in enumerate(casi))
    r = await mdl.chiama([{"role": "system", "content": ISTRUZIONI},
                          {"role": "user", "content": f"=== FONTE ===\n{fonte}\n\n=== NUMERI DA PROVARE ===\n{elenco}"}],
                         {"type": "json_object"})
    righe = r.get("numeri") if isinstance(r, dict) else r
    if not isinstance(righe, list):
        righe = next((v for v in r.values() if isinstance(v, list)), []) if isinstance(r, dict) else []
    return {int(x["n"]): x for x in righe if isinstance(x, dict) and str(x.get("n", "")).strip().isdigit()}


async def main() -> None:
    corso = sys.argv[1]
    bozze, col_giudice = "--bozze" in sys.argv, "--giudice" in sys.argv
    moduli = [a for a in sys.argv[2:] if re.fullmatch(r"m\d\d", a)]
    base = Path(f"produzione/{corso}")
    if not moduli:
        moduli = sorted(f.stem for f in (base / "_fonte").glob("m[0-9][0-9].txt"))
    if bozze:
        slides = [s for m in moduli if (base / "_bozze" / f"{m}.json").exists()
                  for s in json.loads((base / "_bozze" / f"{m}.json").read_text(encoding="utf-8"))["slides"]]
    else:
        slides = json.loads((base / "copioni.json").read_text(encoding="utf-8"))["slides"]
    if col_giudice:
        sys.path.insert(0, "scripts/produzione")
        import orchestratore as O
        env = O.carica_env(); client = O.client_azure(env)

    async def modulo(mod: str):
        fonte = (base / "_fonte" / f"{mod}.txt").read_text(encoding="utf-8")
        F = numeri_della_fonte(fonte)
        n, casi, scritture = 0, [], []
        for s in slides:
            if s["id"].split("_")[1] != mod: continue
            for v, dec, fr, avviso in numeri_del_testo(s["testo"]):
                if avviso:
                    i = s["testo"].find(fr)
                    scritture.append((s["id"], avviso, s["testo"][max(0, i - 50):i + len(fr) + 30].replace("\n", " ")))
                if v != v or (dec == 0 and v < 13): continue
                n += 1
                if stretto(v, dec, F) is None:
                    i = s["testo"].find(fr)
                    casi.append({"id": s["id"], "v": v, "dec": dec, "fr": fr,
                                 "contesto": s["testo"][max(0, i - 260):i + len(fr) + 160].replace("\n", " ")})
        aperti = casi
        if col_giudice and casi:
            mdl = O.Modello(client, env, {"input": 0, "output": 0, "chiamate": 0})
            aperti = []
            for k in range(0, len(casi), 40):
                blocco = casi[k:k + 40]
                try:
                    risposte = await giudica(mdl, fonte, blocco)
                except Exception as e:                   # una chiamata fallita non abbatte il modulo
                    risposte = {}; print(f"  [{mod}] giudice fallito sul blocco {k}: {type(e).__name__}: {e}")
                if blocco and not risposte: print(f"  [{mod}] il giudice non ha restituito nessuna prova per il blocco {k}")
                for i, c in enumerate(blocco):
                    r = risposte.get(i, {})
                    perche = verifica_prova(c["v"], c["dec"], r.get("espressione"), bool(r.get("tondo")), F)
                    if perche is None: continue
                    aperti.append(c | {"perche": perche, "giudice": r.get("motivo", "")})
        return mod, n, len(casi), aperti, scritture

    esiti = await asyncio.gather(*(modulo(m) for m in moduli))
    tot = primo = finali = 0
    righe = []
    anomale = 0
    for mod, n, n1, aperti, scritture in esiti:
        tot += n; primo += n1; finali += len(aperti); anomale += len(scritture)
        print(f"[{mod}] numeri {n} · fuori dallo stadio stretto {n1} · da leggere a mano {len(aperti)} · scritture anomale {len(scritture)}")
        for sid, avviso, ctx in scritture:
            print(f"  ! {sid}: {avviso} — …{ctx}…")
        for c in aperti:
            print(f"  ? {c['id']}: «{c['fr']}» = {c['v']:g}" + (f" — {c['perche']}; giudice: {c['giudice']}" if "perche" in c else ""))
            print(f"      …{c['contesto']}…")
            righe.append(c)
    print(f"TOTALE: {tot} numeri · {primo} fuori dallo stadio stretto · {finali} da leggere a mano · {anomale} scritture anomale"
          + ("" if col_giudice else " (senza giudice: aggiungere --giudice per la prova con espressione)"))
    (base / "_numeri-da-leggere.json").write_text(json.dumps(righe, ensure_ascii=False, indent=1), encoding="utf-8")


asyncio.run(main())
