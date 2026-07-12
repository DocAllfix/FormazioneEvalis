#!/usr/bin/env python3
"""Test pronuncia — ROUND 2 (verdetti utente 2026-07-12 sulla batteria 1).

Obiettivi:
  A. IA/SGIA: soluzioni candidate ascoltate su MOLTE occorrenze reali
     (clip 01 'intelligenza artificiale' vs clip 02 'I A' lettere grezze;
      clip 03 SGIA -> 'esse gi a').
  B. API: frase unica riformulata senza sigla (conferma audio).
  C. Accenti storti (preparandoti/collegati): mining delle classi a rischio
     su tutto il catalogo (gerundio+enclitica, imperativo+enclitica, omografi
     participio/imperativo, parole molto lunghe) + A/B del trucco
     dell'accento forzato scritto (preparàndoti, collegàti).
  D. Controprove dei fix già decisi: PDCA grezzo 'P D C A', codici norma
     compitati ('ventidue mila', 'trentanove milauno'), 'piaccametro'.

Output: produzione/test-pronuncia/round2/*.wav + manifest.md
Uso:  python scripts/produzione/test_pronuncia2.py [--dry-run]
"""
from __future__ import annotations

import collections
import hashlib
import io
import re
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).parent))
from orchestratore import PROD, carica_env, leggi_json  # noqa: E402
from azure_tts import BatchTTS, con_glossario, durata_wav_bytes, ssml_slide  # noqa: E402

OUT = PROD / "test-pronuncia" / "round2"
CORSI = ["19011", "9001", "45001", "27001", "14001", "22000", "37001", "42001", "50001", "39001"]


def frasi(testo: str) -> list[str]:
    return [f.strip() for f in re.split(r"(?<=[.!?])\s+", testo) if f.strip()]


def frasi_corso(corso: str) -> list[str]:
    cop = leggi_json(PROD / corso / "copioni.json")
    out = []
    for s in cop["slides"]:
        out += frasi(s["testo"])
    return out


def cerca(corso: str, patt: str, n: int, max_parole: int = 35,
          escludi: str | None = None) -> list[str]:
    """Prime n frasi reali del corso che matchano patt (ed evitano escludi)."""
    rx, ex = re.compile(patt), re.compile(escludi) if escludi else None
    out: list[str] = []
    for f in frasi_corso(corso):
        if rx.search(f) and len(f.split()) <= max_parole and (not ex or not ex.search(f)):
            if f not in out:
                out.append(f)
                if len(out) >= n:
                    break
    return out


def testo_catalogo() -> str:
    return " ".join(" ".join(frasi_corso(c)) for c in CORSI)


def glossario_di(corso: str, override: dict | None = None) -> dict:
    g = leggi_json(PROD / corso / "glossario-tts.json", {"map": {}})
    m = dict(g.get("map", {}))
    if override:
        m.update(override)
    return {"map": m}


# resa candidata "per esteso": elisioni naturali dell'italiano
IA_ESTESO = {
    "dell'IA": "dell'intelligenza artificiale", "all'IA": "all'intelligenza artificiale",
    "dall'IA": "dall'intelligenza artificiale", "sull'IA": "sull'intelligenza artificiale",
    "nell'IA": "nell'intelligenza artificiale", "un'IA": "un'intelligenza artificiale",
    "l'IA": "l'intelligenza artificiale", "L'IA": "L'intelligenza artificiale",
    "IA": "intelligenza artificiale",
}
# resa candidata "lettere grezze": come P D C A / S G Q promossi nella batteria 1
IA_LETTERE = {
    "dell'IA": "della I A", "all'IA": "alla I A", "dall'IA": "dalla I A",
    "sull'IA": "sulla I A", "nell'IA": "nella I A", "un'IA": "una I A",
    "l'IA": "la I A", "L'IA": "La I A", "IA": "I A",
}


def batteria() -> list[dict]:
    B: list[dict] = []

    def add(nome, corso, testo, check, override=None):
        if testo.strip():
            B.append({"nome": nome, "corso": corso, "testo": testo,
                      "check": check, "override": override})
        else:
            print(f"  ATTENZIONE: {nome} vuoto, escluso")

    # ---- A. IA a molte occorrenze: stesse 10 frasi reali, due rese candidate
    frasi_ia = cerca("42001", r"IA(?![A-Za-z])", 10, max_parole=32, escludi=r"SGIA")
    testo_ia = " ".join(frasi_ia)
    add("r2-01-ia-per-esteso", "42001", testo_ia,
        "CANDIDATA 1: ogni IA detta 'intelligenza artificiale' — giudica naturalezza e lunghezza su 10 frasi reali",
        override=IA_ESTESO)
    add("r2-02-ia-lettere-grezze", "42001", testo_ia,
        "CANDIDATA 2: stesse identiche frasi, IA scritta alla voce come lettere 'I A' — MAI 'ja'? confronta con la 01",
        override=IA_LETTERE)
    add("r2-03-sgia-esse-gi-a", "42001",
        " ".join(cerca("42001", r"SGIA", 8, max_parole=32)),
        "SGIA -> 'esse gi a' su 8 frasi reali: stabile OGNI volta, mai impastato (le IA qui sono per esteso)",
        override={**IA_ESTESO, "SGIA": "esse gi a",
                  "dell'SGIA": "dell'esse gi a", "all'SGIA": "all'esse gi a",
                  "l'SGIA": "l'esse gi a", "un SGIA": "un esse gi a"})

    # ---- B. API riformulata (la frase unica del catalogo, senza più sigla)
    add("r2-04-api-riformulata", "42001",
        "Può trattarsi di un modello acquistato, di un servizio in cloud, di un componente "
        "integrato in un'applicazione, di un sistema generativo richiamato tramite interfacce applicative.",
        "proposta di riformulazione dell'unica frase con API: suona naturale? (se sì, la fisso nei copioni)")

    # ---- C. classi a rischio accento (mining su tutto il catalogo)
    testo_tutto = testo_catalogo().lower()
    freq = collections.Counter(re.findall(r"[a-zà-ù']+", testo_tutto))

    g1 = sorted(((w, n) for w, n in freq.items()
                 if re.fullmatch(r"[a-zà-ù]+ndo(ti|si|lo|la|ci|ne|le|li|vi|mi)", w)),
                key=lambda x: -x[1])
    top_g1 = [w for w, _ in g1[:24]]
    add("r2-05-gerundi-normali", "9001", "; ".join(top_g1) + ".",
        "24 gerundi con enclitica più frequenti del catalogo, così come scritti: "
        "l'accento deve cadere su -àndo/-èndo (preparàndoti, chiedèndoti). Segna quelli storti")
    def accenta_gerundio(w):
        return re.sub(r"ando(?=[a-z]{2})", "àndo", re.sub(r"endo(?=[a-z]{2})", "èndo", w))
    add("r2-06-gerundi-accentati", "9001", "; ".join(accenta_gerundio(w) for w in top_g1) + ".",
        "STESSE 24 parole con accento scritto forzato: se qui suonano tutte giuste, il trucco funziona "
        "e lo applico solo a quelle storte della clip 05")
    add("r2-07-gerundi-in-frase", "39001",
        " ".join(cerca("39001", r"preparandoti", 2, max_parole=40) +
                 cerca("42001", r"chiedendoti", 2, max_parole=40) +
                 cerca("22000", r"concentrandoti", 1, max_parole=40)),
        "gerundi nel contesto reale delle slide: preparandoti x2, chiedendoti x2, concentrandoti")

    imperativi = ["chiediti", "fermati", "preparati", "concentrati", "ricordati", "osservati",
                  "domandati", "allenati", "abituati", "prenditi", "aspettati", "tienilo",
                  "ricordalo", "pensaci", "guardati", "dimostrati"]
    add("r2-08-imperativi-lista", "9001", "; ".join(imperativi) + ".",
        "imperativi con enclitica (chièditi 445 occorrenze!, fèrmati, prepàrati, concèntrati...): "
        "accento sulla PRIMA parte, mai 'chiedìti'. Segna quelli storti")
    add("r2-09-imperativi-in-frase", "42001",
        " ".join(cerca("42001", r"^Chiediti\b", 2, max_parole=30) +
                 cerca("9001", r"^Fermati\b", 1, max_parole=30) +
                 cerca("9001", r"^Preparati\b", 1, max_parole=30) +
                 cerca("9001", r"^Ricordati\b", 1, max_parole=30) +
                 cerca("27001", r"^Ricordati\b", 1, max_parole=30)),
        "gli stessi imperativi dentro frasi vere dei corsi")

    fr_omo = (cerca("9001", r"\bcollegati\b", 3, max_parole=30) +
              cerca("19011", r"\bin seguito\b", 1, max_parole=30) +
              cerca("9001", r"\bhai seguito\b", 1, max_parole=30) +
              cerca("22000", r"\bambito\b", 1, max_parole=30) +
              cerca("27001", r"\bperdono\b", 1, max_parole=30) +
              cerca("42001", r"\bcompito\b", 1, max_parole=30))
    add("r2-10-omografi-in-frase", "9001", " ".join(fr_omo),
        "omografi in contesto reale: 'collegati'=collegàti (participio, 3 frasi), 'in séguito', "
        "'hai seguìto', 'àmbito', 'pèrdono' (verbo), 'còmpito'. Segna quelli sbagliati")
    fr_coll = cerca("9001", r"\bcollegati\b", 3, max_parole=30)
    add("r2-11-collegati-accentato", "9001",
        " ".join(f.replace("collegati", "collegàti") for f in fr_coll),
        "STESSE 3 frasi di 'collegati' della clip 10 ma con accento scritto 'collegàti': "
        "se qui è sempre giusto, il trucco vale anche per gli omografi")

    lunghe = sorted(((w, n) for w, n in freq.items() if len(w) >= 14 and w.isalpha()),
                    key=lambda x: -x[1])
    top_lun = [w for w, _ in lunghe[:48]]
    add("r2-12-parole-lunghe-1", "9001", "; ".join(top_lun[:24]) + ".",
        "le 24 parole ≥14 lettere più frequenti del catalogo: accenti e scioltezza")
    add("r2-13-parole-lunghe-2", "9001", "; ".join(top_lun[24:48]) + ".",
        "le successive 24 parole ≥14 lettere: accenti e scioltezza")

    # ---- D. controprove dei fix già decisi dai tuoi verdetti (16>17, 18>19-14001)
    add("r2-14-pdca-grezzo-migrato", "22000",
        " ".join(cerca("22000", r"\bPDCA\b", 3, max_parole=32)),
        "PDCA reso 'P D C A' (la forma che hai promosso) dentro frasi vere del 22000 (oggi 'pi di ci a'); "
        "qui senti anche 'ISO ventidue mila' compitato",
        override={"PDCA": "P D C A", "22000": "ventidue mila"})
    add("r2-15-codici-compitati", "39001",
        " ".join(cerca("39001", r"\b39001\b", 2, max_parole=30) +
                 cerca("39001", r"\b45001\b", 1, max_parole=30)),
        "codici norma compitati come nel 19011 che hai promosso: 'trentanove milauno', 'quarantacinque milauno' "
        "(oggi in cifre: rischio 'quattordici zero zero uno')",
        override={"39001": "trentanove milauno", "45001": "quarantacinque milauno"})
    add("r2-16-piaccametro", "14001",
        "Oppure pensa a un piaccametro usato in reparto. Il piaccametro va tarato prima di ogni turno.",
        "il termine corretto dello strumento al posto di 'pi acca metro': suona bene?")

    return B


def main() -> None:
    dry = "--dry-run" in sys.argv
    env = carica_env()
    B = batteria()
    for item in B:
        item["parlato"] = con_glossario(item["testo"], glossario_di(item["corso"], item["override"]))

    print(f"batteria round 2: {len(B)} clip · {sum(len(i['parlato']) for i in B)} caratteri")
    for i in B:
        print(f"  {i['nome']}  [{i['corso']}]  {len(i['testo'].split())} parole")
    if dry:
        for i in B:
            print(f"\n--- {i['nome']} ---\nSCRITTO: {i['testo']}\nPARLATO: {i['parlato']}")
        return

    tts = BatchTTS(env)
    ssml = [ssml_slide(i["parlato"], tts.voce, tts.cfg) for i in B]
    job_id = "test-pron-r2-" + hashlib.sha1("".join(ssml).encode()).hexdigest()[:8]
    print(f"job batch {job_id} → attendo la sintesi…")
    zip_bytes = tts.sintetizza(job_id, ssml, "Evalis test pronuncia round 2")

    OUT.mkdir(parents=True, exist_ok=True)
    righe = ["# Test pronuncia ROUND 2 — manifest d'ascolto",
             f"\nVoce: {tts.voce} · standard marcello-v1 · {len(B)} clip\n"]
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        for n, item in enumerate(B, start=1):
            dati = z.read(f"{n:04d}.wav")
            (OUT / f"{item['nome']}.wav").write_bytes(dati)
            d = durata_wav_bytes(dati)
            print(f"  {item['nome']}.wav · {d:.1f}s")
            righe += [f"\n## {item['nome']}.wav ({d:.0f}s)",
                      f"**DA VERIFICARE:** {item['check']}",
                      f"\n> SCRITTO: {item['testo']}",
                      f"\n> LA VOCE VEDE: {item['parlato']}"]
    (OUT / "manifest.md").write_text("\n".join(righe) + "\n", encoding="utf-8")
    print(f"\nfatto → {OUT}")


if __name__ == "__main__":
    main()
