#!/usr/bin/env python3
"""Test pronuncia — ROUND 4 (verdetti utente round 3, 2026-07-12).

Esiti round 3 recepiti:
  - "I A" lettere: instabile (la I sparisce spesso) -> BOCCIATA;
  - "I.A." coi punti: quasi mai sbagliata -> QUI conferma su più materiale;
  - "domandati" e "concediti": SBAGLIATI -> niente sinonimi con enclitica;
    chiediti si risolve con costrutti SENZA enclitica ("chiedi a te stesso");
  - PDCA con virgole: lentissimo, bocciato; "P D C A": glitcha sul "doppio"
    -> si prova "P.D.C.A." coi punti (stessa forma vincente di I.A.);
  - codici "milauno" (spaziato e univerbato): strani -> si prova "mila e uno";
  - gerundi: l'utente chiede il censimento completo -> QUI audio di TUTTE le
    forme gerundio+enclitica del catalogo (tranne -ndoti, che verranno
    comunque riformulate) + conferma dello stile di riformulazione.

Output: produzione/test-pronuncia/round4/*.wav + manifest.md
Uso:  python scripts/produzione/test_pronuncia4.py [--dry-run]
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
from orchestratore import PROD, carica_env  # noqa: E402
from azure_tts import BatchTTS, con_glossario, durata_wav_bytes, ssml_slide  # noqa: E402
from test_pronuncia2 import cerca, glossario_di, testo_catalogo  # noqa: E402
from test_pronuncia3 import IA_PUNTO  # noqa: E402

OUT = PROD / "test-pronuncia" / "round4"


def batteria() -> list[dict]:
    B: list[dict] = []

    def add(nome, corso, testo, check, override=None):
        if testo.strip():
            B.append({"nome": nome, "corso": corso, "testo": testo,
                      "check": check, "override": override})

    # ---- I.A.: conferma su materiale nuovo + ri-sintesi (stabilità)
    tutte_ia = cerca("42001", r"IA(?![A-Za-z])", 30, max_parole=32, escludi=r"SGIA")
    nuove_a, nuove_b = " ".join(tutte_ia[10:20]), " ".join(tutte_ia[20:30])
    add("r4-01-ia-punto-nuove-a", "42001", nuove_a,
        "I.A. coi punti su 10 frasi MAI sentite prima: la I si sente sempre?", override=IA_PUNTO)
    add("r4-02-ia-punto-nuove-b", "42001", nuove_b,
        "I.A. coi punti su altre 10 frasi nuove: conferma", override=IA_PUNTO)
    add("r4-03-ia-punto-nuove-a-bis", "42001", nuove_a,
        "RI-SINTESI identica della r4-01: stessa resa alla seconda campionatura?", override=IA_PUNTO)

    # ---- chiediti: costrutti SENZA enclitica (le encliti che domandati/concediti sono bocciate)
    fr_chiediti = cerca("42001", r"^Chiediti\b", 2, max_parole=30) + \
                  cerca("9001", r"\bchiediti\b", 1, max_parole=30)
    add("r4-04-chiedi-a-te-stesso", "42001",
        " ".join(f.replace("Chiediti", "Chiedi a te stesso").replace("chiediti", "chiedi a te stesso")
                 for f in fr_chiediti),
        "il sostituto SENZA enclitica per le 445 occorrenze di 'chiediti': "
        "'chiedi a te stesso' — scorrevole e con gli accenti giusti?")
    add("r4-05-prova-a-chiederti", "42001",
        " ".join(f.replace("Chiediti", "Prova a chiederti").replace("chiediti", "prova a chiederti")
                 for f in fr_chiediti),
        "alternativa B: 'prova a chiederti' (l'infinito chiederti era giusto nella r3-04) — "
        "quale delle due preferisci, questa o la r4-04?")

    # ---- PDCA: la forma coi punti (come I.A.) sulle stesse frasi incriminate
    frasi_pdca = " ".join(cerca("22000", r"\bPDCA\b", 3, max_parole=32))
    add("r4-06-pdca-coi-punti", "22000", frasi_pdca,
        "P.D.C.A. coi punti (stessa ricetta di I.A.), incluso il 'doppio P.D.C.A.' che glitchava: stabile?",
        override={"PDCA": "P.D.C.A.", "22000": "ventiduemila"})
    add("r4-07-pdca-coi-punti-bis", "22000", frasi_pdca,
        "RI-SINTESI identica della r4-06: il glitch ricompare?",
        override={"PDCA": "P.D.C.A.", "22000": "ventiduemila"})

    # ---- codici norma: schema "mila e uno"
    add("r4-08-codici-mila-e-uno", "39001",
        " ".join(cerca("39001", r"\b39001\b", 2, max_parole=30) +
                 cerca("39001", r"\b45001\b", 1, max_parole=30)),
        "codici letti 'trentanovemila e uno', 'quarantacinquemila e uno': "
        "sparisce la stranezza del 'milauno'?",
        override={"39001": "trentanovemila e uno", "45001": "quarantacinquemila e uno"})
    add("r4-09-codici-mila-e-uno-2", "50001",
        " ".join(cerca("50001", r"\b14001\b", 1, max_parole=32) +
                 cerca("50001", r"\b50001\b", 2, max_parole=32) +
                 cerca("9001", r"ISO 19011", 1, max_parole=32)),
        "altri codici: 'quattordicimila e uno', 'cinquantamila e uno', 'diciannovemila e undici'",
        override={"14001": "quattordicimila e uno", "50001": "cinquantamila e uno",
                  "ISO 19011": "ISO diciannovemila e undici", "19011": "diciannovemila e undici"})

    # ---- gerundi: conferma stile riformulazione (basandoti sparisce, non si sostituisce)
    add("r4-10-gerundi-stile-fix", "39001",
        "Costruisci il giudizio sulla base delle evidenze raccolte, non delle impressioni. "
        "Nella prossima slide completeremo questo quadro, tirando le fila del modulo, "
        "così ti prepari al passaggio successivo. "
        "Leggi ogni scenario con calma, e chiedi a te stesso quale evidenza pesa di più. "
        "Fermati un momento e rileggi la mappa del modulo prima del checkpoint.",
        "lo stile definitivo delle riformulazioni (niente più -ndoti, niente enclitiche a rischio): "
        "tutto scorrevole e con gli accenti giusti?")

    # ---- censimento audio COMPLETO dei gerundi+enclitica restanti del catalogo
    # (rete larga: anche -ndogli e le enclitiche doppie -ndotene/-ndoselo/-ndoglielo;
    #  le forme in -ndoti/-ndomi sono escluse: verranno riformulate a prescindere)
    encl = (r"(gli(elo|ela|eli|ele|ene)?|se(lo|la|li|le|ne)|te(lo|la|li|le|ne)|"
            r"ce(lo|la|li|le|ne)|ve(lo|la|li|le|ne)|me(lo|la|li|le|ne)|"
            r"ti|si|lo|la|ci|ne|le|li|vi|mi)")
    freq = collections.Counter(re.findall(r"[a-zà-ù']+", testo_catalogo().lower()))
    forme = sorted((w for w in freq
                    if re.fullmatch(r"[a-zà-ù]+ndo" + encl, w)
                    and not re.search(r"ndo(ti|mi)$", w)),
                   key=lambda w: -freq[w])
    for k in range(0, len(forme), 24):
        blocco = forme[k:k + 24]
        n_clip = k // 24 + 1
        add(f"r4-1{n_clip}-censimento-gerundi-{n_clip}", "9001", "; ".join(blocco) + ".",
            f"censimento {n_clip}: 24 forme gerundio+enclitica del catalogo (per frequenza) — "
            "segna SOLO quelle con l'accento sbagliato (giusto = accento su -àndo/-èndo)")
    print(f"  censimento gerundi: {len(forme)} forme residue (escluse -ndoti/-ndomi) "
          f"in {(len(forme) + 23) // 24} clip")

    return B


def main() -> None:
    dry = "--dry-run" in sys.argv
    env = carica_env()
    B = batteria()
    for item in B:
        item["parlato"] = con_glossario(item["testo"], glossario_di(item["corso"], item["override"]))

    print(f"batteria round 4: {len(B)} clip · {sum(len(i['parlato']) for i in B)} caratteri")
    for i in B:
        print(f"  {i['nome']}  [{i['corso']}]  {len(i['testo'].split())} parole")
    if dry:
        for i in B:
            print(f"\n--- {i['nome']} ---\nSCRITTO: {i['testo']}\nPARLATO: {i['parlato']}")
        return

    tts = BatchTTS(env)
    ssml = [ssml_slide(i["parlato"], tts.voce, tts.cfg) for i in B]
    job_id = "test-pron-r4-" + hashlib.sha1("".join(ssml).encode()).hexdigest()[:8]
    print(f"job batch {job_id} → attendo la sintesi…")
    zip_bytes = tts.sintetizza(job_id, ssml, "Evalis test pronuncia round 4")

    OUT.mkdir(parents=True, exist_ok=True)
    righe = ["# Test pronuncia ROUND 4 — manifest d'ascolto",
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
