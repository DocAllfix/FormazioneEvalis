#!/usr/bin/env python3
"""LA RICETTA — modulo UNICO e OBBLIGATORIO per la generazione audio del catalogo.

Estratto ESATTO della pipeline che ha prodotto il golden sample v8-xtts.wav
(2026-07-02, approvato dall'utente: "quasi perfetto, nessun accento sbagliato").
Qualsiasi generazione di produzione DEVE passare da qui. Vedi docs/produzione-corsi/RICETTA-TTS.md.

Garanzie:
  - formattazione testo identica al golden (frase-per-frase, <=213 char, punto via, riscritture)
  - parametri XTTS congelati (quelli del golden)
  - post-processing identico (trim testa -55dB, fade 60ms, gap 0.28s, RMS 0.05)
  - DETERMINISMO: seed per frase = hash(slide_id + testo) -> stessa frase = stesso audio, sempre;
    la rigenerazione post-QA usa seed+retry e il seed vincente va REGISTRATO in audio-map.
"""

import hashlib
import re

import numpy as np

SR = 24000
GAP_S = 0.28
FADE_TAIL_S = 0.06
TRIM_DB = -55.0
RMS_TARGET = 0.05
MAX_CHARS = 213

# parametri del golden sample v8-xtts (NON toccare senza rifare il golden test)
XTTS_PARAMS = {
    "temperature": 0.70,
    "repetition_penalty": 9.0,
    "top_k": 50,
    "top_p": 0.85,
    "speed": 0.96,
    "gpt_cond_len": 30,
    "gpt_cond_chunk_len": 6,
}


def respell(text: str) -> str:
    """Pronunce imposte (confini di parola). Estendibile via glossario del corso.
    "AUditor" (non "àuditor"): vincitore della matrice d'ascolto 2026-07-03 su
    riferimento v2 — con l'accento grafico Vox sbaglia spesso, con le maiuscole
    sulla sillaba accentata quasi mai. Il QA non ne risente (canon() minuscola)."""
    text = re.sub(r"\bauditor\b", "AUditor", text, flags=re.IGNORECASE)
    return re.sub(r"\baudit\b", "àudit", text, flags=re.IGNORECASE)


def applica_glossario(text: str, glossario: dict) -> str:
    """Numeri/sigle per esteso ('ISO 19011' -> 'ISO diciannove milaundici')."""
    for k in sorted(glossario.get("map", {}), key=len, reverse=True):
        text = text.replace(k, glossario["map"][k])
    return text


def frasi_ricetta(text: str) -> list[str]:
    """Formattazione GOLDEN v11 (approvata 2026-07-02 sera): frase-per-frase STANDALONE
    (niente fusione: le pause retoriche restano), mai oltre 213 char (spezzate all'ultima
    virgola utile), punto finale e '…' RIMOSSI, e VIRGOLA FINALE aggiunta a ogni frase che
    non termina con '?'/'!' — segnale di continuazione: XTTS articola per intero l'ultima
    parola (niente ingoi, niente accenti spostati), la virgola non viene letta e il silenzio
    residuo lo taglia il postproc."""
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    # domande/esclamazioni ULTRA-CORTE (<25 char, es. "Perché?") si attaccano alla frase
    # successiva tenendo il segno: il '?' interno dà l'intonazione senza essere letto,
    # e la parola non resta mai sola senza contesto (fix v12: taglio su "Perché?")
    attached = []
    for s in sents:
        if attached and attached[-1].rstrip().endswith(("?", "!")) and len(attached[-1]) < 25:
            attached[-1] = attached[-1].rstrip() + " " + s
        else:
            attached.append(s)
    sents = attached
    out = []
    for s in sents:
        while len(s) > MAX_CHARS:
            cut = s.rfind(",", 0, MAX_CHARS)
            if cut < 60:
                cut = MAX_CHARS
            out.append(s[:cut].strip())
            s = s[cut + 1:].strip()
        out.append(s)
    fixed = []
    for x in out:
        x = x.rstrip(".…").strip()
        if x and x[-1] not in "?!,":
            x += ","
        fixed.append(x)
    return [x for x in fixed if x.rstrip(",")]


def seed_frase(slide_id: str, testo: str, retry: int = 0) -> int:
    """Seed deterministico per frase: stessa frase = stesso audio, per sempre.
    Il retry post-QA incrementa; il seed VINCENTE va salvato in audio-map."""
    h = hashlib.sha256(f"{slide_id}|{testo}|{retry}".encode("utf-8")).hexdigest()
    return int(h[:8], 16)


def postproc_frase(wav) -> np.ndarray:
    """Post-processing GOLDEN per singola frase: trim SOLO testa (soglia dolce),
    fade-out coda 60ms, RMS uniforme."""
    p = np.asarray(wav, dtype=np.float32).squeeze()
    peak = float(np.max(np.abs(p))) or 1.0
    idx = np.where(np.abs(p) > peak * 10 ** (TRIM_DB / 20))[0]
    if len(idx):
        p = p[max(0, idx[0] - int(0.02 * SR)):]
    fade_n = int(FADE_TAIL_S * SR)
    if len(p) > fade_n:
        p[-fade_n:] *= np.linspace(1, 0, fade_n, dtype=np.float32)
    rms = float(np.sqrt(np.mean(p ** 2))) or 1e-9
    return (p * (RMS_TARGET / rms)).astype(np.float32)


def cuci(pieces: list[np.ndarray]) -> np.ndarray:
    """Giunzione GOLDEN: gap esatto 0.28s di silenzio puro tra le frasi."""
    gap = np.zeros(int(GAP_S * SR), dtype=np.float32)
    out = []
    for i, p in enumerate(pieces):
        out.append(p)
        if i < len(pieces) - 1:
            out.append(gap)
    return np.concatenate(out)


# ================= RICETTA VOXCPM (TITOLARE, dal v12 approvato) =================
VOX_PARAMS = {"cfg_value": 3.0}
VOX_GAP_S = 0.15  # Vox pausa già da solo sui punti: gap tra blocchi più corto

def blocchi_vox(text: str, lo: int = 120, hi: int = 280) -> list[str]:
    """Formattazione VOX (dal v12 approvato): blocchi di 2-3 frasi CON punteggiatura
    INTEGRALE (Vox la usa per pause/prosodia e non legge il punto), 120-280 char."""
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    out, cur = [], ""
    for s in sents:
        cand = f"{cur} {s}".strip()
        if cur and len(cand) > hi:
            out.append(cur)
            cur = s
        else:
            cur = cand
        if len(cur) >= lo and len(cur) >= 150:
            out.append(cur)
            cur = ""
    if cur:
        out.append(cur)
    return out

def vox_blocco(model, testo_blocco: str, ref_wav: str, ref_text: str) -> np.ndarray:
    """UN blocco VOX, postprocessato (trim testa, fade coda, RMS) al sample rate nativo."""
    sr_v = model.tts_model.sample_rate
    wav = model.generate(text=testo_blocco, prompt_wav_path=ref_wav, prompt_text=ref_text,
                         reference_wav_path=ref_wav, **VOX_PARAMS)
    p = np.asarray(wav, dtype=np.float32).squeeze()
    peak = float(np.max(np.abs(p))) or 1.0
    idx = np.where(np.abs(p) > peak * 10 ** (TRIM_DB / 20))[0]
    if len(idx):
        p = p[max(0, idx[0] - int(0.02 * sr_v)):]
    fade_n = int(FADE_TAIL_S * sr_v)
    if len(p) > fade_n:
        p[-fade_n:] *= np.linspace(1, 0, fade_n, dtype=np.float32)
    rms = float(np.sqrt(np.mean(p ** 2))) or 1e-9
    return (p * (RMS_TARGET / rms)).astype(np.float32)

def cuci_vox(pieces: list[np.ndarray], sr_nativo: int, sr_out: int = SR) -> np.ndarray:
    """Giunzione VOX: gap 0.15s (Vox pausa già da solo sui punti) + resample a sr_out."""
    import librosa

    gap = np.zeros(int(VOX_GAP_S * sr_nativo), dtype=np.float32)
    out = []
    for i, p in enumerate(pieces):
        out.append(p)
        if i < len(pieces) - 1:
            out.append(gap)
    audio = np.concatenate(out)
    if sr_nativo != sr_out:
        audio = librosa.resample(audio, orig_sr=sr_nativo, target_sr=sr_out)
    return audio.astype(np.float32)

def genera_slide_vox(model, slide_id: str, testo: str, ref_wav: str, ref_text: str,
                     glossario: dict | None = None, sr_out: int = SR):
    """Pipeline VOX completa per UNA slide (identica al v12 approvato dal cliente),
    SENZA QA (per il loop con QA-retry usare qa_ricetta.genera_slide_vox_qa)."""
    testo = respell(applica_glossario(testo, glossario or {"map": {}}))
    blocchi = blocchi_vox(testo)
    pieces = [vox_blocco(model, b, ref_wav, ref_text) for b in blocchi]
    return cuci_vox(pieces, model.tts_model.sample_rate, sr_out), blocchi

def genera_slide_xtts(tts, slide_id: str, testo: str, speaker_wav: str,
                      glossario: dict | None = None, seeds: dict | None = None) -> np.ndarray:
    """Pipeline completa per UNA slide, identica al golden sample.
    `seeds`: mappa frase-idx -> retry vincente (dal QA); default 0."""
    import torch

    testo = respell(applica_glossario(testo, glossario or {"map": {}}))
    pieces = []
    for i, frase in enumerate(frasi_ricetta(testo)):
        retry = (seeds or {}).get(str(i), 0)
        torch.manual_seed(seed_frase(slide_id, frase, retry))
        wav = tts.tts(text=frase, speaker_wav=speaker_wav, language="it", **XTTS_PARAMS)
        pieces.append(postproc_frase(wav))
    return cuci(pieces)
