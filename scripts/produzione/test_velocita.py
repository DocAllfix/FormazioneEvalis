#!/usr/bin/env python3
"""Test VELOCITÀ voce — Fase 0 del nastro B (richiesta utente 2026-07-12:
"voce troppo moscia, può andare leggermente più veloce senza sbagliare pronuncia?").

6 varianti dello STESSO testo reale (19011 m01, già ascoltato dall'utente):
  A = marcello-v1 attuale (rate -5%, pause 400/180/250)  [riferimento]
  B = rate -3%, pause invariate
  C = rate -1%, pause invariate
  D = rate  0%, pause invariate
  E = rate -1%, pause 500/210/300 (compensazione monte-ore)
  F = rate  0%, pause 550/230/320 (compensazione monte-ore)

Output: produzione/test-pronuncia/velocita/*.wav + manifest.md con TABELLA DURATE
misurate e proiezione del monte-ore per corso (margine vs minuti legali).
Uso:  python scripts/produzione/test_velocita.py [--dry-run]
"""
from __future__ import annotations

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

OUT = PROD / "test-pronuncia" / "velocita"

VARIANTI = [
    ("A-attuale-v1",   {"rate": "-5%", "pitch": "-3%", "sil_frase": "400ms", "sil_virgola": "180ms", "sil_pv": "250ms"}),
    ("B-rate-3",       {"rate": "-3%", "pitch": "-3%", "sil_frase": "400ms", "sil_virgola": "180ms", "sil_pv": "250ms"}),
    ("C-rate-1",       {"rate": "-1%", "pitch": "-3%", "sil_frase": "400ms", "sil_virgola": "180ms", "sil_pv": "250ms"}),
    ("D-rate-0",       {"rate": "0%",  "pitch": "-3%", "sil_frase": "400ms", "sil_virgola": "180ms", "sil_pv": "250ms"}),
    ("E-rate-1-pause", {"rate": "-1%", "pitch": "-3%", "sil_frase": "500ms", "sil_virgola": "210ms", "sil_pv": "300ms"}),
    ("F-rate-0-pause", {"rate": "0%",  "pitch": "-3%", "sil_frase": "550ms", "sil_virgola": "230ms", "sil_pv": "320ms"}),
]

# (minuti stimati a marcello-v1, minuti legali) per corso
CORSI_LEGALI = {
    "19011": (985, 960), "9001": (1453, 1440), "45001": (1450, 1440), "27001": (1452, 1440),
    "14001": (1448, 1440), "22000": (1448, 1440), "37001": (1452, 1440), "42001": (1448, 1440),
    "50001": (1448, 1440), "39001": (1448, 1440), "agg14001": (483, 480),
}


def testo_prova() -> str:
    """~280 parole reali da 19011 m01 s002 + ~60 parole con numeri/edizioni da s006."""
    cop = leggi_json(PROD / "19011" / "copioni.json")
    sl = {s["id"][-4:]: s["testo"] for s in cop["slides"] if "_m01_" in s["id"]}
    base, n = [], 0
    for f in re.split(r"(?<=[.!?])\s+", sl["s002"]):
        base.append(f); n += len(f.split())
        if n >= 280:
            break
    numeri, n2 = [], 0
    for f in re.split(r"(?<=[.!?])\s+", sl["s006"]):
        if re.search(r"\d", f):
            numeri.append(f); n2 += len(f.split())
        if n2 >= 60:
            break
    return " ".join(base + numeri)


def main() -> None:
    dry = "--dry-run" in sys.argv
    env = carica_env()
    gloss = leggi_json(PROD / "19011" / "glossario-tts.json", {"map": {}})
    testo = testo_prova()
    parlato = con_glossario(testo, gloss)
    n_parole = len(testo.split())
    print(f"testo di prova: {n_parole} parole · {len(parlato)} caratteri (x6 varianti)")
    if dry:
        print(parlato[:600]); return

    tts = BatchTTS(env)
    ssml = [ssml_slide(parlato, tts.voce, cfg) for _, cfg in VARIANTI]
    job_id = "test-velocita-" + hashlib.sha1("".join(ssml).encode()).hexdigest()[:8]
    print(f"job batch {job_id} → attendo la sintesi…")
    zip_bytes = tts.sintetizza(job_id, ssml, "Evalis test velocita voce")

    OUT.mkdir(parents=True, exist_ok=True)
    durate = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        for n, (nome, cfg) in enumerate(VARIANTI, start=1):
            dati = z.read(f"{n:04d}.wav")
            (OUT / f"{nome}.wav").write_bytes(dati)
            durate[nome] = durata_wav_bytes(dati)
            print(f"  {nome}.wav · {durate[nome]:.1f}s")

    dA = durate["A-attuale-v1"]
    righe = ["# Test velocità voce — manifest d'ascolto e proiezione monte-ore",
             f"\nTesto identico per tutte le varianti: {n_parole} parole (19011 m01, reale).",
             "Ascolta A (attuale) e confrontala con B-F. E ed F alzano il ritmo del parlato",
             "ma allungano le pause per NON perdere minuti legali.\n",
             "| Variante | rate | pause f/v/pv | durata | delta vs attuale | parole/s |",
             "|---|---|---|---|---|---|"]
    for nome, cfg in VARIANTI:
        d = durate[nome]
        righe.append(f"| {nome} | {cfg['rate']} | {cfg['sil_frase']}/{cfg['sil_virgola']}/{cfg['sil_pv']} "
                     f"| {d:.1f}s | {(d/dA-1)*100:+.1f}% | {n_parole/d:.3f} |")
    righe += ["", "## Proiezione monte-ore per corso (minuti reali stimati = stima attuale x rapporto misurato)",
              "", "| Corso | legali | A (attuale) | " + " | ".join(n for n, _ in VARIANTI[1:]) + " |",
              "|---|---|---|" + "---|" * (len(VARIANTI) - 1)]
    for corso, (stima_min, legali) in CORSI_LEGALI.items():
        celle = []
        for nome, _ in VARIANTI[1:]:
            m = stima_min * durate[nome] / dA
            celle.append(f"{m:.0f} {'OK' if m >= legali else 'SOTTO'}")
        righe.append(f"| {corso} | {legali} | {stima_min} OK | " + " | ".join(celle) + " |")
    righe += ["", "NB: proiezione col rapporto misurato sul testo di prova (densità di punteggiatura",
              "rappresentativa). SOTTO = corso sotto i minuti legali: variante NON usabile così."]
    (OUT / "manifest.md").write_text("\n".join(righe) + "\n", encoding="utf-8")
    print()
    print("\n".join(righe[4:11]))
    print(f"\nfatto → {OUT}")


if __name__ == "__main__":
    main()
