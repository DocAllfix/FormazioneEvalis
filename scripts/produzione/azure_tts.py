#!/usr/bin/env python3
"""Motore audio Azure TTS — Fabbrica v3 (sostituisce VoxCPM di tts_ricetta.py).

STANDARD VOCE congelato 2026-07-09 (verdetto utente sulle batterie di ascolto):
  Marcello Multilingual · flusso naturale (NIENTE break fissi) · pause di
  punteggiatura imposte (frase 400ms, virgola 180ms, punto-e-virgola 250ms) ·
  rate -5% · pitch -3% · numeri norma in CIFRE · trattini sigle -> "parte N"
  (glossario) · vietato "disciplina" come verbo (FABBRICA-MODULO §2.7).

GARANZIE DI INTEGRITÀ (ogni wav è giusto, funzionante, della slide giusta):
  - il nome file È l'ID canonico <corso>_mNN_sNNN (= chiave copioni = clip = LMS);
  - audio-map.json registra per slide lo sha256 di (testo glossariato + config
    voce): testo cambiato o standard cambiato => il file è STALE e si rigenera;
  - QA (--qa) verifica per OGNI file: A integrità RIFF · B durata vs stima ·
    C IDENTITÀ: i token del word.json (= ciò che è stato sintetizzato DENTRO
    quel wav) devono combaciare col testo della slide attesa — un file
    scambiato/mescolato non può passare · D il timeline del word.json deve
    chiudere sulla durata reale del wav (troncamenti/accoppiamenti errati) ·
    E coerenza id<->cartella · F completezza modulo (nessun buco, nessun orfano).

Uso:
  python scripts/produzione/azure_tts.py <corso> [--modulo mNN] [--force]
         [--qa] [--dry-run] [--smoke]
  --qa      SOLO verifica (nessuna sintesi): exit 1 se un check fallisce
Credenziali in .env.produzione. Richiede: pip install requests
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
POLL_S = 10
TIMEOUT_JOB_S = 1800
# standard congelato (overridabili via env solo per esperimenti, mai in produzione)
# v2 (2026-07-12, verdetto utente sul test velocità, variante F): parlato a rate 0%
# (piu dinamico del -5% di v1), pause allungate 550/230/320 + coda di 1s a fine slide
# per compensare il monte-ore legale (margine reale +1,2-1,4%) e dare aria ai tagli avatar.
STD = {"rate": "0%", "pitch": "-3%",
       "sil_frase": "550ms", "sil_virgola": "230ms", "sil_pv": "320ms"}
CODA_FINE_SLIDE = "1000ms"
VERSIONE_STANDARD = "marcello-v2 (2026-07-12)"


# ---------------------------------------------------------------- testo → SSML
def con_glossario(testo: str, glossario: dict) -> str:
    """Forme parlate del glossario (chiavi più lunghe prima), come conGlossario del lint.

    RETE DI SICUREZZA TRATTINI (2026-07-10, richiesta utente): dopo il glossario,
    QUALUNQUE trattino residuo tra due lettere viene sciolto in spazio — la voce
    non deve mai vedere un trattino (quasi-incidente -> quasi incidente, follow-up
    -> follow up). I trattini nei NUMERI restano vietati a monte (gate E3) e le
    fusioni preferite (ri-valutazione -> rivalutazione) restano nel glossario.
    """
    for k in sorted(glossario.get("map", {}), key=len, reverse=True):
        testo = testo.replace(k, glossario["map"][k])
    testo = re.sub(r"(?<=[a-zà-ùA-ZÀ-Ù])-(?=[a-zà-ùA-ZÀ-Ù])", " ", testo)
    # LISTA BIANCA DURA (2026-07-10, richiesta utente): dopo glossario e scioglimento
    # trattini, il testo parlato può contenere SOLO alfabeto, cifre, spazi e
    # punteggiatura di pausa. Trattini residui, parentesi, slash, virgolette o
    # simboli => la sintesi si RIFIUTA (mai audio sbagliato in silenzio).
    residui = sorted(set(re.findall(r"[^a-zA-Zà-ùÀ-Ù0-9\s.,;:!?']", testo)))
    if residui:
        raise ValueError(f"testo NON parlabile, caratteri fuori lista bianca {residui}: "
                         f"aggiungere forma parlata al glossario del corso")
    return testo


def ssml_slide(testo: str, voce: str, cfg: dict) -> str:
    """SSML dello standard: flusso naturale + silenzi di punteggiatura + prosodia."""
    sil = (f'<mstts:silence type="Sentenceboundary-exact" value="{cfg["sil_frase"]}"/>'
           f'<mstts:silence type="Comma-exact" value="{cfg["sil_virgola"]}"/>'
           f'<mstts:silence type="Semicolon-exact" value="{cfg["sil_pv"]}"/>')
    corpo = f'<prosody rate="{cfg["rate"]}" pitch="{cfg["pitch"]}">{escape(testo)}</prosody>'
    coda = f'<break time="{CODA_FINE_SLIDE}"/>'  # aria a fine slide (monte-ore + tagli avatar)
    return (f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            f'xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="it-IT">'
            f'<voice name="{voce}">{sil}{corpo}{coda}</voice></speak>')


def sha_slide(testo_glossariato: str, voce: str, cfg: dict) -> str:
    """Impronta di ciò che determina l'audio: testo parlato + voce + standard."""
    base = testo_glossariato + "|" + voce + "|" + json.dumps(cfg, sort_keys=True) + "|" + VERSIONE_STANDARD
    return hashlib.sha256(base.encode()).hexdigest()


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
        self.cfg = {k: env.get(f"AZURE_TTS_{k.upper()}", v) for k, v in STD.items()}

    def _url(self, job_id: str) -> str:
        return f"{self.base}/texttospeech/batchsyntheses/{job_id}?api-version={API_VERSION}"

    def sintetizza(self, job_id: str, ssml_inputs: list[str], descrizione: str) -> bytes:
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
        self.http.delete(self._url(job_id))
        return r.content


def durata_wav_bytes(dati: bytes) -> float:
    with wave.open(io.BytesIO(dati)) as w:
        return round(w.getnframes() / w.getframerate(), 3)


def durata_wav_file(path: Path) -> float:
    with wave.open(str(path)) as w:
        return round(w.getnframes() / w.getframerate(), 3)


# ---------------------------------------------------------------- QA
PAROLA_RE = re.compile(r"[a-zà-ú0-9]+", re.I)
PUNTEGGIATURA = set(".,;:!?…")


def _tokens(testo: str) -> list[str]:
    return [t.lower() for t in PAROLA_RE.findall(testo)]


def _allinea(words: list[dict], attesi: list[str]) -> tuple[int, int]:
    """Allineamento greedy word.json -> testo atteso. Con mstts:silence Azure emette,
    oltre alle parole, entry-artefatto che duplicano pezzi del testo seguente (con o
    senza punteggiatura iniziale, anche gruppi multi-parola — verificato 2026-07-09).
    Regola robusta: si scorre ogni entry in ordine; se i suoi token combaciano col
    testo atteso alla posizione corrente si consumano, altrimenti l'entry si salta.
    Un audio della slide GIUSTA consuma il 100% dei token attesi; un audio della
    slide SBAGLIATA si blocca presto. Ritorna (consumati, attesi_totali)."""
    p = 0
    for w in words:
        ts = _tokens(w["Text"])
        if ts and attesi[p:p + len(ts)] == ts:
            p += len(ts)
            if p >= len(attesi):
                break
    return p, len(attesi)


def qa_slide(corso: str, mod: str, slide: dict, glossario: dict, voce: str,
             cfg: dict, registro: dict) -> list[str]:
    """Checks A-E su una slide. Ritorna la lista dei problemi (vuota = ok)."""
    problemi = []
    sid = slide["id"]
    out_dir = PROD / corso / "audio" / mod
    wav_p, word_p = out_dir / f"{sid}.wav", out_dir / f"{sid}.word.json"

    # E — id <-> cartella (per costruzione, ma verificato comunque)
    if not sid.startswith(f"{corso}_{mod}_"):
        problemi.append(f"E: id {sid} fuori posto in {corso}/{mod}")
    if not wav_p.exists() or not word_p.exists():
        return problemi + [f"A: file mancante ({'wav' if not wav_p.exists() else 'word.json'})"]

    # A — integrità RIFF + byte REALI vs header (un file troncato conserva l'header
    # originale: wave legge l'header, quindi si confronta con la dimensione su disco)
    try:
        with wave.open(str(wav_p)) as w:
            frames, rate = w.getnframes(), w.getframerate()
            attesi_byte = frames * w.getsampwidth() * w.getnchannels()
        durata = round(frames / rate, 3)
        if durata <= 1:
            problemi.append(f"A: wav vuoto/anomalo ({durata}s)")
        reali = wav_p.stat().st_size
        if reali < attesi_byte:  # header dichiara più dati di quanti ce ne siano
            problemi.append(f"A: TRONCATO — header dichiara {attesi_byte} byte di audio, "
                            f"sul disco ce ne sono {reali}")
    except Exception as e:
        return problemi + [f"A: wav illeggibile ({e})"]

    # H — impronta: il file è ESATTAMENTE quello scritto (e verificato) alla sintesi
    reg_slide = registro.get("slide", {}).get(sid, {})
    if reg_slide.get("wav_sha"):
        if hashlib.sha256(wav_p.read_bytes()).hexdigest() != reg_slide["wav_sha"]:
            problemi.append("H: wav ALTERATO dopo la sintesi (sha diverso dal registro) — "
                            "file scambiato o corrotto")

    # staleness — l'audio corrisponde al testo/standard ATTUALI?
    testo_g = con_glossario(slide["testo"], glossario)
    sha = sha_slide(testo_g, voce, cfg)
    reg = registro.get("slide", {}).get(sid, {})
    if reg.get("sha") != sha:
        problemi.append("G: STALE — testo o standard voce cambiati dopo la sintesi")

    # B — durata vs stima dalle parole
    stima = len(slide["testo"].split()) / PAROLE_AL_SECONDO
    if not (0.75 * stima <= durata <= 1.35 * stima):
        problemi.append(f"B: durata {durata:.0f}s fuori finestra vs stima {stima:.0f}s")

    # C — IDENTITÀ: le parole sintetizzate DENTRO il wav sono quelle della slide?
    try:
        words = json.loads(word_p.read_text(encoding="utf-8"))
    except Exception as e:
        return problemi + [f"C: word.json illeggibile ({e})"]
    consumati, attesi = _allinea(words, _tokens(testo_g))
    if consumati < attesi:
        problemi.append(f"C: TESTO NON COMBACIA — l'audio copre solo {consumati}/{attesi} "
                        f"token del testo atteso: file della slide sbagliata?")

    # D — il timeline del word.json chiude sulla durata REALE del wav
    if words:
        fine_ms = words[-1]["AudioOffset"] + words[-1]["Duration"]
        if abs(durata - fine_ms / 1000) > 2.0:
            problemi.append(f"D: timeline word.json chiude a {fine_ms/1000:.1f}s ma il wav dura "
                            f"{durata:.1f}s — troncamento o accoppiamento errato")
    return problemi


def qa_modulo(corso: str, mod: str, slides: list[dict], glossario: dict,
              voce: str, cfg: dict) -> bool:
    registro = leggi_json(PROD / corso / "_log" / f"audio-{mod}.json", {})
    out_dir = PROD / corso / "audio" / mod
    tutti_ok = True
    for s in slides:
        problemi = qa_slide(corso, mod, s, glossario, voce, cfg, registro)
        if problemi:
            tutti_ok = False
            for p in problemi:
                print(f"  QA {s['id']}: {p}")
    # F — completezza: nessun orfano nella cartella
    attesi = {s["id"] for s in slides}
    if out_dir.exists():
        for w in out_dir.glob("*.wav"):
            if w.stem not in attesi:
                tutti_ok = False
                print(f"  QA {mod}: F: file ORFANO {w.name} (nessuna slide corrispondente)")
    if tutti_ok:
        tot = sum(durata_wav_file(out_dir / f"{s['id']}.wav") for s in slides
                  if (out_dir / f"{s['id']}.wav").exists())
        print(f"  QA {mod} OK: {len(slides)} slide integre, associate e attuali · {tot/60:.1f} min")
    return tutti_ok


# ---------------------------------------------------------------- pipeline modulo
def sintetizza_modulo(tts: BatchTTS, corso: str, mod: str, slides: list[dict],
                      glossario: dict, force: bool) -> None:
    out_dir = PROD / corso / "audio" / mod
    reg_path = PROD / corso / "_log" / f"audio-{mod}.json"
    registro = leggi_json(reg_path, {"slide": {}})

    def fresco(s):  # wav+word presenti E sha attuale (testo+standard invariati)
        sid = s["id"]
        if not ((out_dir / f"{sid}.wav").exists() and (out_dir / f"{sid}.word.json").exists()):
            return False
        sha = sha_slide(con_glossario(s["testo"], glossario), tts.voce, tts.cfg)
        return registro["slide"].get(sid, {}).get("sha") == sha

    da_fare = [s for s in slides if force or not fresco(s)]
    if not da_fare:
        print(f"[{mod}] tutte le {len(slides)} slide fresche (testo+standard invariati): skip")
        return

    ssml = [ssml_slide(con_glossario(s["testo"], glossario), tts.voce, tts.cfg) for s in da_fare]
    print(f"[{mod}] job batch: {len(da_fare)} slide da sintetizzare "
          f"({len(slides)-len(da_fare)} fresche) · standard {VERSIONE_STANDARD}")
    job_id = f"{corso}-{mod}-{hashlib.sha1(''.join(ssml).encode()).hexdigest()[:8]}"
    zip_bytes = tts.sintetizza(job_id, ssml, f"Evalis {corso} {mod}")

    out_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        nomi = set(z.namelist())
        for i, s in enumerate(da_fare, start=1):
            wav_nome, word_nome = f"{i:04d}.wav", f"{i:04d}.word.json"
            if wav_nome not in nomi or word_nome not in nomi:
                raise RuntimeError(f"{job_id}: manca {wav_nome if wav_nome not in nomi else word_nome} "
                                   f"nello ZIP ({s['id']})")
            dati = z.read(wav_nome)
            (out_dir / f"{s['id']}.wav").write_bytes(dati)
            (out_dir / f"{s['id']}.word.json").write_bytes(z.read(word_nome))
            durata = durata_wav_bytes(dati)
            testo_g = con_glossario(s["testo"], glossario)
            stima = len(s["testo"].split()) / PAROLE_AL_SECONDO
            registro["slide"][s["id"]] = {
                "sha": sha_slide(testo_g, tts.voce, tts.cfg),
                "wav_sha": hashlib.sha256(dati).hexdigest(),
                "durata_s": durata, "stima_s": round(stima, 1),
                "delta_pct": round((durata / stima - 1) * 100, 1),
            }
    registro["voce"] = tts.voce
    registro["standard"] = VERSIONE_STANDARD
    registro["cfg"] = tts.cfg
    registro["totale_s"] = round(sum(v["durata_s"] for v in registro["slide"].values()), 1)
    scrivi_atomico(reg_path, json.dumps(registro, ensure_ascii=False, indent=2) + "\n")
    print(f"[{mod}] sintetizzate {len(da_fare)} slide · {registro['totale_s']/60:.1f} min totali modulo")
    # QA obbligatorio subito dopo la sintesi: niente audio non verificato nel repo
    if not qa_modulo(corso, mod, slides, glossario, tts.voce, tts.cfg):
        raise RuntimeError(f"[{mod}] QA FALLITO dopo la sintesi — vedere i problemi sopra")


# ---------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description="Motore audio Azure TTS (Fabbrica v3)")
    ap.add_argument("corso", nargs="?")
    ap.add_argument("--modulo")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--qa", action="store_true", help="solo verifica, nessuna sintesi")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    env = carica_env()

    if a.smoke:
        tts = BatchTTS(env)
        ssml = ssml_slide("Benvenuto nel percorso Evalis Academy. Questa è una prova di sintesi, "
                          "con la voce e lo standard scelti per i corsi.", tts.voce, tts.cfg)
        zip_bytes = tts.sintetizza(f"smoke-{int(time.time())}", [ssml], "smoke test")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            dati = z.read("0001.wav")
        dest = PROD / "asset" / "smoke-azure.wav"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(dati)
        print(f"smoke ok — {durata_wav_bytes(dati)}s → {dest} (voce {tts.voce}, {VERSIONE_STANDARD})")
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
        tot_char = sum(len(con_glossario(s["testo"], glossario)) for m in moduli for s in per_mod[m])
        for m in moduli:
            char = sum(len(con_glossario(s["testo"], glossario)) for s in per_mod[m])
            print(f"  {m}: {len(per_mod[m])} slide, ~{char/1000:.0f}k caratteri")
        print(f"totale {tot_char/1e6:.2f}M caratteri · ~${tot_char/1e6*15:.0f} standard neural")
        print(f"standard: {VERSIONE_STANDARD} · voce {voce}")
        return

    if a.qa:
        tts_cfg = {k: env.get(f"AZURE_TTS_{k.upper()}", v) for k, v in STD.items()}
        voce = env.get("AZURE_SPEECH_VOICE", "")
        ok = all(qa_modulo(a.corso, m, per_mod[m], glossario, voce, tts_cfg) for m in moduli)
        sys.exit(0 if ok else 1)

    tts = BatchTTS(env)
    for m in moduli:
        sintetizza_modulo(tts, a.corso, m, per_mod[m], glossario, a.force)


if __name__ == "__main__":
    main()
