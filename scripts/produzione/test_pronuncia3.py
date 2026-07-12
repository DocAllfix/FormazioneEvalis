#!/usr/bin/env python3
"""Test pronuncia — ROUND 3 (verdetti utente round 2, 2026-07-12).

Esiti round 2 recepiti:
  - accento scritto forzato (r2-06) BOCCIATO: la voce cambia lingua -> mai più;
  - parole storte confermate: preparandoti, chiedendoti, basandoti (gerundi),
    chiediti (445 occ), prenditi (imperativi) -> qui si testano i SOSTITUTI
    ("domandati" è pronunciato bene, infiniti prepararti/chiederti/basarti,
    "concediti");
  - IA "I A": a volte la I sparisce -> riprova su richiesta + variante "I.A.";
  - PDCA "P D C A": ok ma lento/un glitch -> variante "P, D, C, A" + ri-sintesi;
  - codici "trentanove milauno" strano -> variante UNIVERBATA "trentanovemilauno".

Output: produzione/test-pronuncia/round3/*.wav + manifest.md
Uso:  python scripts/produzione/test_pronuncia3.py [--dry-run]
"""
from __future__ import annotations

import hashlib
import io
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).parent))
from orchestratore import PROD, carica_env  # noqa: E402
from azure_tts import BatchTTS, con_glossario, durata_wav_bytes, ssml_slide  # noqa: E402
from test_pronuncia2 import cerca, glossario_di, IA_LETTERE  # noqa: E402

OUT = PROD / "test-pronuncia" / "round3"

IA_PUNTO = {
    "dell'IA": "della I.A.", "all'IA": "alla I.A.", "dall'IA": "dalla I.A.",
    "sull'IA": "sulla I.A.", "nell'IA": "nella I.A.", "un'IA": "una I.A.",
    "l'IA": "la I.A.", "L'IA": "La I.A.", "IA": "I.A.",
}


def batteria() -> list[dict]:
    B: list[dict] = []

    def add(nome, corso, testo, check, override=None):
        if testo.strip():
            B.append({"nome": nome, "corso": corso, "testo": testo,
                      "check": check, "override": override})

    frasi_ia = " ".join(cerca("42001", r"IA(?![A-Za-z])", 10, max_parole=32, escludi=r"SGIA"))

    # --- IA: riprova richiesta + variante nuova
    add("r3-01-ia-lettere-bis", "42001", frasi_ia,
        "RI-SINTESI IDENTICA della r2-02 ('I A'): senti se la I sparisce negli stessi punti "
        "o in punti diversi (= instabilità casuale)", override=IA_LETTERE)
    add("r3-02-ia-lettere-ter", "42001", frasi_ia,
        "SECONDA ri-sintesi identica ('I A'): terza campionatura della stessa resa",
        override=IA_LETTERE)
    add("r3-03-ia-punto", "42001", frasi_ia,
        "VARIANTE NUOVA: 'I.A.' scritta come abbreviazione con i punti — la I si sente sempre? "
        "le pause restano naturali?", override=IA_PUNTO)

    # --- sostituti delle parole storte
    add("r3-04-sostituti-lista", "9001",
        "prepararti; prepararsi; chiederti; chiedersi; basarti; basarsi; "
        "domandati; domandandoti; concediti; fermarti; ricordarti; concentrarti.",
        "gli infiniti con enclitica e i sinonimi candidati a sostituire le parole storte: "
        "devono suonare tutti con l'accento giusto (preparàrti, chièderti, domàndati, concèditi)")
    add("r3-05-chiediti-diventa-domandati", "42001",
        " ".join(cerca("42001", r"^Chiediti\b", 2, max_parole=30)).replace("Chiediti", "Domandati"),
        "le stesse 2 frasi vere che iniziavano con 'Chiediti' (sbagliato 445 volte nel catalogo), "
        "con lo scambio in voce 'Domandati': se suona giusto, il fix è una mappa di glossario")
    add("r3-06-gerundi-riformulati", "39001",
        "Nella prossima slide completeremo questo quadro, tirando le fila del modulo, "
        "così ti prepari al passaggio successivo, dove entrerai nella struttura della norma. "
        "Nella prossima slide tirerai le fila di tutto, per prepararti al checkpoint "
        "e all'aggancio con il modulo successivo. "
        "Leggi ogni scenario con calma, chiedendo a te stesso quale evidenza pesa di più. "
        "Costruisci il giudizio basandoti sulle evidenze raccolte, non sulle impressioni. "
        "Costruisci il giudizio fondandoti sulle evidenze raccolte, non sulle impressioni.",
        "le riformulazioni candidate per i gerundi storti: 'così ti prepari', 'per prepararti', "
        "'chiedendo a te stesso', e per basandoti la prova diretta + il sinonimo 'fondandoti'")
    add("r3-07-prenditi-concediti", "9001",
        "Concediti un momento per rileggere le evidenze prima di formulare il giudizio. "
        "Prima del checkpoint, concediti una pausa breve e rileggi la mappa del modulo.",
        "'concediti' al posto di 'prenditi' (5 occorrenze): accento giusto concèditi?")

    # --- PDCA: variante con virgole + ri-sintesi della forma promossa
    frasi_pdca = " ".join(cerca("22000", r"\bPDCA\b", 3, max_parole=32))
    add("r3-08-pdca-virgole", "22000", frasi_pdca,
        "PDCA reso 'P, D, C, A' con le virgole (pausa 180ms tra le lettere): "
        "più scandito e stabile della r2-14?", override={"PDCA": "P, D, C, A", "22000": "ventiduemila"})
    add("r3-09-pdca-ripetuta", "22000", frasi_pdca,
        "RI-SINTESI della r2-14 ('P D C A' senza virgole): il glitch 'doppio p d ia' ricapita?",
        override={"PDCA": "P D C A", "22000": "ventiduemila"})

    # --- codici norma UNIVERBATI (trentanovemilauno come si dice davvero)
    add("r3-10-codici-univerbati", "39001",
        " ".join(cerca("39001", r"\b39001\b", 2, max_parole=30) +
                 cerca("39001", r"\b45001\b", 1, max_parole=30)),
        "codici scritti UNIVERBATI: 'trentanovemilauno', 'quarantacinquemilauno' — "
        "il 'mila' strano della r2-15 sparisce?",
        override={"39001": "trentanovemilauno", "45001": "quarantacinquemilauno"})
    add("r3-11-codici-univerbati-2", "50001",
        " ".join(cerca("50001", r"\b14001\b", 1, max_parole=32) +
                 cerca("50001", r"\b50001\b", 2, max_parole=32) +
                 cerca("9001", r"ISO 19011", 1, max_parole=32)),
        "altri codici univerbati: 'quattordicimilauno', 'cinquantamilauno', 'diciannovemilaundici'",
        override={"14001": "quattordicimilauno", "50001": "cinquantamilauno",
                  "ISO 19011": "ISO diciannovemilaundici", "19011": "diciannovemilaundici"})

    return B


def main() -> None:
    dry = "--dry-run" in sys.argv
    env = carica_env()
    B = batteria()
    for item in B:
        item["parlato"] = con_glossario(item["testo"], glossario_di(item["corso"], item["override"]))

    print(f"batteria round 3: {len(B)} clip · {sum(len(i['parlato']) for i in B)} caratteri")
    for i in B:
        print(f"  {i['nome']}  [{i['corso']}]  {len(i['testo'].split())} parole")
    if dry:
        for i in B:
            print(f"\n--- {i['nome']} ---\nSCRITTO: {i['testo']}\nPARLATO: {i['parlato']}")
        return

    tts = BatchTTS(env)
    ssml = [ssml_slide(i["parlato"], tts.voce, tts.cfg) for i in B]
    job_id = "test-pron-r3-" + hashlib.sha1("".join(ssml).encode()).hexdigest()[:8]
    print(f"job batch {job_id} → attendo la sintesi…")
    zip_bytes = tts.sintetizza(job_id, ssml, "Evalis test pronuncia round 3")

    OUT.mkdir(parents=True, exist_ok=True)
    righe = ["# Test pronuncia ROUND 3 — manifest d'ascolto",
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
