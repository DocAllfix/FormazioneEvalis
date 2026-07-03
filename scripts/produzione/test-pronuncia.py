#!/usr/bin/env python3
"""MATRICE PRONUNCIA "auditor" (VoxCPM) — gira sul pod, output: wav brevi da ascoltare.

Contesto: il riferimento EL1 pronuncia "àuditor" GIUSTO ma Vox lo sbaglia spesso
(l'imitazione del riferimento non basta per questa parola). Whisper è sordo agli
accenti, quindi il verdetto è SOLO d'orecchio: questo script produce la matrice
grafia × riferimento (2 take per cella, Vox è stocastico) da far ascoltare al cliente.

Varianti grafia (W = auditor, àudit resta fisso: oggi viene detto bene):
  attuale    "àuditor"                 — ricetta corrente (respell)
  maiuscole  "AUditor"                 — enfasi grafica sulla sillaba accentata
  trattino   "àudi-tor"                — spezza la parola
  fonemi     "{AW1 D IH0 T AO0 R}"     — input fonetico CMUDict (via ufficiale,
  fonemi_er  "{AW1 D IH0 T ER0}"         richiede normalize=False)

Riferimenti: EL1 (ufficiale, hash-checked) e, se presente, EL1+frase densa di
àuditor (voce-riferimento-el-v2.wav, stessa voce ElevenLabs).
"""

import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

W = Path("/workspace/prod")
REF = W / "produzione/asset/voce-riferimento-el.wav"
REF_V2 = W / "produzione/asset/voce-riferimento-el-v2.wav"  # opzionale
OUT = W / "pronuncia"
OUT.mkdir(parents=True, exist_ok=True)

TPL = ("Ogni {w} prepara il piano dell'àudit con cura. Durante l'àudit, il {w} "
       "raccoglie le evidenze con metodo, e al termine ogni {w} presenta le "
       "proprie conclusioni al gruppo di lavoro.")

VARIANTI = [
    ("attuale",   "àuditor",             True),   # ricetta corrente (controllo)
    ("maiuscole", "AUditor",             True),   # il "qualcosa di diverso"
    ("fonemi",    "{AW1 D IH0 T AO0 R}", False),  # via ufficiale VoxCPM
]
TAKES = 3
CFG = 3.0  # ricetta v12

manifest = json.load(open(W / "produzione/asset/voce-manifest.json"))
ref_text = manifest["ref_text"]
ref_text_v2 = None
if REF_V2.exists():
    v2m = W / "produzione/asset/voce-manifest-v2.json"
    ref_text_v2 = json.load(open(v2m))["ref_text"] if v2m.exists() else None

from voxcpm import VoxCPM
model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, device="cuda")
import torch
assert torch.cuda.is_available(), "CUDA ASSENTE"
sr = model.tts_model.sample_rate

def genera(nome: str, testo: str, ref_wav: Path, rtext: str, normalize: bool):
    for take in range(1, TAKES + 1):
        try:
            wav = model.generate(text=testo, prompt_wav_path=str(ref_wav),
                                 prompt_text=rtext, reference_wav_path=str(ref_wav),
                                 cfg_value=CFG, normalize=normalize)
        except TypeError:
            # versione voxcpm senza kwarg normalize: si prova senza (solo grafie)
            if not normalize:
                print(f"!! {nome}: normalize non supportato da questa API — SALTATO")
                return
            wav = model.generate(text=testo, prompt_wav_path=str(ref_wav),
                                 prompt_text=rtext, reference_wav_path=str(ref_wav),
                                 cfg_value=CFG)
        p = np.asarray(wav, dtype=np.float32).squeeze()
        f = OUT / f"pronuncia_{nome}_take{take}.wav"
        sf.write(str(f), p, sr)
        print(f"ok {f.name} ({len(p)/sr:.1f}s)", flush=True)

# matrice completa: ogni grafia × entrambi i riferimenti (3 take a cella)
for nome, w, norm in VARIANTI:
    genera(f"ref1_{nome}", TPL.format(w=w), REF, ref_text, norm)
    if REF_V2.exists() and ref_text_v2:
        genera(f"refv2_{nome}", TPL.format(w=w), REF_V2, ref_text_v2, norm)
if not (REF_V2.exists() and ref_text_v2):
    print("(riferimento v2 assente: matrice solo ref1)")

print("MATRICE COMPLETATA:", len(list(OUT.glob("*.wav"))), "wav in", OUT)
