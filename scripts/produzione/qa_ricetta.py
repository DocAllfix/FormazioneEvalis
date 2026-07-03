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


def coda_ok(atteso: str, sentito: str, glossario: dict | None = None) -> bool:
    """Rinforzo anti-taglio (2026-07-03): l'ULTIMA parola del blocco deve comparire
    nel finale della trascrizione. Un blocco lungo con la sola coda mangiata può
    restare sopra la soglia di similarità globale: questo check chiude lo spiraglio."""
    ca = canon(atteso, glossario).split()
    cs = canon(sentito, glossario).split()
    if not ca or not cs:
        return False
    return ca[-1] in cs[-4:]


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
        best, best_sim, best_coda, retries = None, -1.0, False, 0
        for retry in range(MAX_RETRY):
            p = vox_blocco(model, b, ref_wav, ref_text)
            t = trascrivi(whisper, p, sr_v)
            sim = similarita(b, t, glossario)
            coda = coda_ok(b, t, glossario)
            # una take con la coda intera batte sempre una take monca, poi conta la sim
            if (coda, sim) > (best_coda, best_sim):
                best, best_sim, best_coda = p, sim, coda
            retries = retry
            if sim >= SOGLIA_BLOCCO and coda:
                break
        status = "PASS" if (best_sim >= SOGLIA_BLOCCO and best_coda) else "FLAGGED"
        report.append({"blocco": i, "sim": round(best_sim, 3), "retry": retries,
                       "coda_ok": best_coda, "status": status, "testo": b[:80]})
        print(f"  [{slide_id} b{i}] {status} sim={best_sim:.3f} coda={'ok' if best_coda else 'MONCA'} retry={retries}")
        pieces.append(best)
    return cuci_vox(pieces, sr_v, sr_out), report
