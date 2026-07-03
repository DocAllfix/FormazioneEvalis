#!/usr/bin/env python3
"""TEST PRONUNCIA round 2 — verdetto matrice: ref v2 risolve l'accento; il difetto
"il auditor" era un refuso del template del round 1 (articolo sbagliato davanti a vocale).

Qui: copione VERO da ~2 minuti (grammatica corretta, ~16 auditor + ~13 audit) generato
con la pipeline di produzione (blocchi_vox + vox_blocco + cuci_vox, ricetta v12) su
riferimento v2, in due grafie: "àuditor" (respell attuale) e "AUditor".
Output: 2 wav da ascoltare — se sono puliti, la soluzione si congela nella ricetta.
"""

import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

W = Path("/workspace/prod")
sys.path.insert(0, str(W / "scripts/produzione"))
from tts_ricetta import respell, blocchi_vox, vox_blocco, cuci_vox, SR

REF = W / "produzione/asset/voce-riferimento-el-v2.wav"
ref_text = json.load(open(W / "produzione/asset/voce-manifest-v2.json"))["ref_text"]
OUT = W / "pronuncia"
OUT.mkdir(parents=True, exist_ok=True)

TESTO = """Benvenuto in questa lezione dedicata al ruolo dell'auditor. In ogni sistema di gestione, l'auditor è la figura incaricata di condurre l'audit con metodo e indipendenza. Quando un auditor prepara un audit, definisce il piano, i criteri e il campo di applicazione. Gli auditor più esperti sanno che ogni audit comincia molto prima della riunione di apertura: l'auditor studia la documentazione, analizza i processi e prepara le domande giuste.
Durante l'audit, l'auditor raccoglie le evidenze e le confronta con i criteri di riferimento. Un buon auditor osserva, ascolta e verifica, senza mai giudicare le persone: l'audit valuta il sistema, non gli individui. Se emergono non conformità, l'auditor le documenta con precisione, perché ogni conclusione dell'audit deve poggiare su evidenze oggettive.
Al termine dell'audit, l'auditor presenta i risultati nella riunione di chiusura. È il momento in cui gli auditor condividono le osservazioni con l'organizzazione, spiegano le non conformità e rispondono alle domande. Il rapporto di audit, redatto dall'auditor responsabile, diventa la memoria ufficiale dell'intero processo.
Ricorda: la credibilità di un audit dipende dalla competenza dell'auditor. Per questo la norma dedica un intero capitolo alla valutazione degli auditor, ai loro requisiti e al loro aggiornamento continuo. Un auditor competente rende l'audit uno strumento di fiducia, capace di generare valore per tutta l'organizzazione. Nel prossimo modulo vedremo come l'auditor pianifica un programma di audit completo, dalla definizione degli obiettivi fino al riesame finale."""

from voxcpm import VoxCPM
model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, device="cuda")
import torch
assert torch.cuda.is_available(), "CUDA ASSENTE"

base = respell(TESTO)  # -> àuditor / àudit (pipeline di produzione)
VARIANTI = [
    ("v2_attuale",   base),
    ("v2_maiuscole", base.replace("àuditor", "AUditor")),  # DOPO respell (che è case-insensitive)
]

import time
for nome, testo in VARIANTI:
    t0 = time.time()
    blocchi = blocchi_vox(testo)
    pieces = [vox_blocco(model, b, str(REF), ref_text) for b in blocchi]
    audio = cuci_vox(pieces, model.tts_model.sample_rate, SR)
    f = OUT / f"pronuncia2_{nome}.wav"
    sf.write(str(f), audio, SR)
    print(f"ok {f.name} ({len(audio)/SR:.1f}s, {len(blocchi)} blocchi, gen {time.time()-t0:.0f}s)", flush=True)

print("ROUND 2 COMPLETATO:", len(list(OUT.glob('pronuncia2_*.wav'))), "wav")
