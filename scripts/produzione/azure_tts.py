#!/usr/bin/env python3
"""Motore audio Azure TTS — Fabbrica v3 (sostituisce VoxCPM di tts_ricetta.py).

Converte i copioni LOCKED in SSML (frase-per-frase con le pause GOLDEN della
ricetta: 0,28s tra le frasi) e li sintetizza con la Batch Synthesis API di
Azure Speech (api-version 2024-04-01): un job per modulo, wordBoundary attivo
(il .word.json per slide alimenta il sync labiale dell'avatar). Idempotente:
slide già sintetizzata → skip.

Output per slide:
  produzione/<corso>/audio/<mNN>/<slide_id>.wav        riff-24khz-16bit-mono-pcm
  produzione/<corso>/audio/<mNN>/<slide_id>.word.json  offset+durata ms per parola
  produzione/<corso>/_log/audio-<mNN>.json             durate reali vs stima (2,35 p/s)

Uso:
  python scripts/produzione/azure_tts.py <corso> [--modulo mNN] [--force]
         [--dry-run] [--smoke]
  --smoke   1 frase breve end-to-end (job batch vero) → produzione/asset/smoke-azure.wav

Credenziali in .env.produzione: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION,
AZURE_SPEECH_VOICE (es. it-IT-…Neural). Opzionali: AZURE_SPEECH_ENDPOINT
(default https://<region>.api.cognitive.microsoft.com), AZURE_TTS_BREAK_MS
(default 280), AZURE_TTS_LEXICON_URI (lexicon .pls pubblicato — si compila
SOLO dopo il test d'ascolto). Richiede: pip install requests
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import time
import wave
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).parent))
from orchestratore import PAROLE_AL_SECONDO, REPO, PROD, carica_env, leggi_json, scrivi_atomico  # noqa: E402

API_VERSION = "2024-04-01"
FORMATO = "riff-24khz-16bit-mono-pcm"
POLL_S = 10          # il 95% dei job chiude entro 2 min
TIMEOUT_JOB_S = 1800


# ---------------------------------------------------------------- testo → SSML
def con_glossario(testo: str, glossario: dict) -> str:
    """Forme parlate del glossario (chiavi più lunghe prima), come conGlossario del lint."""
    for k in sorted(glossario.get("map", {}), key=len, reverse=True):
        testo = testo.replace(k, glossario["map"][k])
    return testo


def frasi(testo: str) -> list[str]:
    """Split frase-per-frase della ricetta GOLDEN (le pause retoriche restano)."""
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", testo) if s.strip()]


def ssml_slide(testo: str, voce: str, break_ms: int, lexicon_uri: str = "") -> str:
    lex = f'<lexicon uri="{escape(lexicon_uri, {chr(34): "&quot;"})}"/>' if lexicon_uri else ""
    corpo = f'<break time="{break_ms}ms"/>'.join(escape(f) for f in frasi(testo))
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="it-IT">'
            f'<voice name="{voce}">{lex}{corpo}</voice></speak>')


# ---------------------------------------------------------------- client batch
class BatchTTS:
    def __init__(self, env: dict[str, str]):
        import requests
        mancanti = [k for k in ("AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION", "AZURE_SPEECH_VOICE")
                    if not env.get(k)]
        if mancanti:
            sys.exit(f"credenziali mancanti in .env.produzione: {', '.join(mancanti)}")
        self.http = requests.Session()
        self.http.headers["Ocp-Apim-Subscription-Key"] = env["AZURE_SPEECH_KEY"]
        self.base = env.get("AZURE_SPEECH_ENDPOINT",
                            f"https://{env['AZURE_SPEECH_REGION']}.api.cognitive.microsoft.com").rstrip("/")
        self.voce = env["AZURE_SPEECH_VOICE"]
        self.break_ms = int(env.get("AZURE_TTS_BREAK_MS", "280"))
        self.lexicon = env.get("AZURE_TTS_LEXICON_URI", "")

    def _url(self, job_id: str) -> str:
        return f"{self.base}/texttospeech/batchsyntheses/{job_id}?api-version={API_VERSION}"

    def sintetizza(self, job_id: str, ssml_inputs: list[str], descrizione: str) -> bytes:
        """PUT job → poll → ZIP dei risultati (0001.wav… nell'ordine degli input)."""
        body = {
            "description": descrizione,
            "inputKind": "SSML",
            "inputs": [{"content": s} for s in ssml_inputs],
            "properties": {
                "outputFormat": FORMATO,
                "wordBoundaryEnabled": True,
                "sentenceBoundaryEnabled": False,
                "concatenateResult": False,
                "decompressOutputFiles": False,
                "timeToLiveInHours": 48,
            },
        }
        r = self.http.put(self._url(job_id), json=body)
        if r.status_code not in (200, 201):
            raise RuntimeError(f"PUT job {job_id}: {r.status_code} {r.text[:400]}")
        t0 = time.time()
        while True:
            time.sleep(POLL_S)
            r = self.http.get(self._url(job_id))
            r.raise_for_status()
            job = r.json()
            if job["status"] == "Succeeded":
                break
            if job["status"] == "Failed":
                raise RuntimeError(f"job {job_id} FALLITO: {json.dumps(job.get('properties', {}))[:600]}")
            if time.time() - t0 > TIMEOUT_JOB_S:
                raise RuntimeError(f"job {job_id}: timeout dopo {TIMEOUT_JOB_S}s (status {job['status']})")
        r = self.http.get(job["outputs"]["result"])
        r.raise_for_status()
        # pulizia: la history del job non serve più (i risultati sono scaricati)
        self.http.delete(self._url(job_id))
        return r.content


def durata_wav(dati: bytes) -> float:
    with wave.open(io.BytesIO(dati)) as w:
        return round(w.getnframes() / w.getframerate(), 3)


# ---------------------------------------------------------------- pipeline modulo
def sintetizza_modulo(tts: BatchTTS, corso: str, mod: str, slides: list[dict],
                      glossario: dict, force: bool) -> dict:
    out_dir = PROD / corso / "audio" / mod
    da_fare = [s for s in slides if force or not (
        (out_dir / f"{s['id']}.wav").exists() and (out_dir / f"{s['id']}.word.json").exists())]
    if not da_fare:
        print(f"[{mod}] tutte le {len(slides)} slide già sintetizzate: skip")
        return leggi_json(PROD / corso / "_log" / f"audio-{mod}.json", {})

    ssml = [ssml_slide(con_glossario(s["testo"], glossario), tts.voce, tts.break_ms, tts.lexicon)
            for s in da_fare]
    payload_kb = sum(len(x.encode()) for x in ssml) // 1024
    print(f"[{mod}] job batch: {len(da_fare)} slide, ~{payload_kb} KB SSML")
    job_id = f"{corso}-{mod}-{hashlib.sha1(''.join(ssml).encode()).hexdigest()[:8]}"
    zip_bytes = tts.sintetizza(job_id, ssml, f"Evalis {corso} {mod}")

    registro = leggi_json(PROD / corso / "_log" / f"audio-{mod}.json", {"slide": {}})
    out_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        nomi = set(z.namelist())
        for i, s in enumerate(da_fare, start=1):
            wav_nome = f"{i:04d}.wav"
            if wav_nome not in nomi:
                raise RuntimeError(f"{job_id}: manca {wav_nome} nello ZIP ({s['id']})")
            dati = z.read(wav_nome)
            (out_dir / f"{s['id']}.wav").write_bytes(dati)
            parole_json = f"{i:04d}.word.json"
            if parole_json in nomi:
                (out_dir / f"{s['id']}.word.json").write_bytes(z.read(parole_json))
            durata = durata_wav(dati)
            stima = len(s["testo"].split()) / PAROLE_AL_SECONDO
            registro["slide"][s["id"]] = {"durata_s": durata, "stima_s": round(stima, 1),
                                          "delta_pct": round((durata / stima - 1) * 100, 1)}
    registro["voce"] = tts.voce
    registro["totale_s"] = round(sum(v["durata_s"] for v in registro["slide"].values()), 1)
    scrivi_atomico(PROD / corso / "_log" / f"audio-{mod}.json",
                   json.dumps(registro, ensure_ascii=False, indent=2) + "\n")
    print(f"[{mod}] ok: {len(da_fare)} slide, {registro['totale_s']/60:.1f} min reali "
          f"(voce {tts.voce})")
    return registro


# ---------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description="Motore audio Azure TTS (Fabbrica v3)")
    ap.add_argument("corso", nargs="?")
    ap.add_argument("--modulo")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    env = carica_env()

    if a.smoke:
        tts = BatchTTS(env)
        ssml = ssml_slide("Benvenuto nel percorso Evalis Academy. Questa è una prova di sintesi, "
                          "con la voce scelta per i corsi.", tts.voce, tts.break_ms, tts.lexicon)
        zip_bytes = tts.sintetizza(f"smoke-{int(time.time())}", [ssml], "smoke test")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            dati = z.read("0001.wav")
        dest = PROD / "asset" / "smoke-azure.wav"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(dati)
        print(f"smoke ok — {durata_wav(dati)}s → {dest} (voce {tts.voce})")
        return

    if not a.corso:
        ap.error("corso mancante")
    copioni = leggi_json(PROD / a.corso / "copioni.json")
    if copioni is None:
        sys.exit(f"manca produzione/{a.corso}/copioni.json")
    glossario = leggi_json(PROD / a.corso / "glossario-tts.json", {"map": {}})
    per_mod: dict[str, list[dict]] = {}
    for s in copioni["slides"]:
        m = re.search(r"_(m\d\d)_", s["id"])
        per_mod.setdefault(m.group(1), []).append(s)
    moduli = [a.modulo] if a.modulo else sorted(per_mod)
    for m in moduli:
        if m not in per_mod:
            sys.exit(f"modulo {m} non presente nei copioni di {a.corso}")

    if a.dry_run:
        voce = env.get("AZURE_SPEECH_VOICE", "<AZURE_SPEECH_VOICE>")
        tot_char = 0
        for m in moduli:
            char = sum(len(con_glossario(s["testo"], glossario)) for s in per_mod[m])
            tot_char += char
            print(f"  {m}: {len(per_mod[m])} slide, ~{char/1000:.0f}k caratteri")
        print(f"totale {tot_char/1e6:.2f}M caratteri · costo neural standard ~${tot_char/1e6*15:.0f}")
        print("esempio SSML prima slide:")
        print(ssml_slide(con_glossario(per_mod[moduli[0]][0]["testo"], glossario)[:300] + ".",
                         voce, int(env.get("AZURE_TTS_BREAK_MS", "280"))))
        return

    tts = BatchTTS(env)
    for m in moduli:
        sintetizza_modulo(tts, a.corso, m, per_mod[m], glossario, a.force)


if __name__ == "__main__":
    main()
