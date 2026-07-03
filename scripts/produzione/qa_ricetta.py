#!/usr/bin/env python3
"""QA v2 — round-trip Whisper con le 3 tarature scoperte nel test del 2026-07-02:
  1. modello large-v3 (lo small produce falsi positivi)
  2. normalizzazione NUMERI bidirezionale (Whisper riscrive "diciannove milaundici" come
     "19 011": entrambe le forme collassano a '#' prima del confronto)
  3. punteggio PER BLOCCO (non globale): il difetto in un blocco non si diluisce
Loop di produzione: genera blocco -> QA -> se sotto soglia RIGENERA (max 3) -> FLAGGED se
persiste. Vox non ha seed: ogni retry campiona diverso e di norma converge al 1° giro.
"""

import difflib
import re
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

from tts_ricetta import applica_glossario, blocchi_vox, cuci_vox, respell, vox_blocco

SOGLIA_BLOCCO = 0.85
MAX_RETRY = 3


def canon(text: str, glossario: dict | None = None) -> str:
    """Forma canonica per il confronto: minuscole, senza accenti/punteggiatura,
    numeri COLLASSATI a '#' sia in forma cifre ('19 011') che in forma parlata
    del glossario ('diciannove milaundici') -> le due grafie diventano identiche."""
    t = text.lower()
    for a, b in [("à", "a"), ("è", "e"), ("é", "e"), ("ì", "i"), ("ò", "o"), ("ù", "u")]:
        t = t.replace(a, b)
    # forme parlate del glossario -> '#'
    for spoken in (glossario or {}).get("map", {}).values():
        s = spoken.lower()
        for a, b in [("à", "a"), ("è", "e"), ("é", "e"), ("ì", "i"), ("ò", "o"), ("ù", "u")]:
            s = s.replace(a, b)
        t = t.replace(s, " # ")
    t = re.sub(r"[^\w\s#]", " ", t)
    t = re.sub(r"\d[\d\s.,]*", " # ", t)      # sequenze di cifre -> '#'
    t = re.sub(r"(#\s*)+", "# ", t)            # '#' consecutivi collassati
    return re.sub(r"\s+", " ", t).strip()


def similarita(atteso: str, sentito: str, glossario: dict | None = None) -> float:
    return difflib.SequenceMatcher(None, canon(atteso, glossario),
                                   canon(sentito, glossario)).ratio()


def trascrivi(whisper, audio: np.ndarray, sr: int) -> str:
    """Trascrive un array audio (via wav temporaneo, robusto su ogni sr)."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        sf.write(f.name, audio, sr)
        path = f.name
    segs, _ = whisper.transcribe(path, language="it")
    out = " ".join(s.text.strip() for s in segs)
    Path(path).unlink(missing_ok=True)
    return out


def genera_slide_vox_qa(model, whisper, slide_id: str, testo: str, ref_wav: str,
                        ref_text: str, glossario: dict | None = None, sr_out: int = 24000):
    """Produzione VOX con QA-retry autonomo per blocco.
    Ritorna (audio, report) — report per blocco: {sim, retry, status PASS|FLAGGED, testo}."""
    glossario = glossario or {"map": {}}
    testo_norm = respell(applica_glossario(testo, glossario))
    sr_v = model.tts_model.sample_rate
    pieces, report = [], []
    for i, b in enumerate(blocchi_vox(testo_norm)):
        best, best_sim, retries = None, -1.0, 0
        for retry in range(MAX_RETRY):
            p = vox_blocco(model, b, ref_wav, ref_text)
            sim = similarita(b, trascrivi(whisper, p, sr_v), glossario)
            if sim > best_sim:
                best, best_sim = p, sim
            retries = retry
            if sim >= SOGLIA_BLOCCO:
                break
        status = "PASS" if best_sim >= SOGLIA_BLOCCO else "FLAGGED"
        report.append({"blocco": i, "sim": round(best_sim, 3), "retry": retries,
                       "status": status, "testo": b[:80]})
        print(f"  [{slide_id} b{i}] {status} sim={best_sim:.3f} retry={retries}")
        pieces.append(best)
    return cuci_vox(pieces, sr_v, sr_out), report
