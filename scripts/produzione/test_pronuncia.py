#!/usr/bin/env python3
"""Test pronuncia sigle — batteria pre-batch audio (gate di ascolto utente).

Sintetizza con lo STESSO motore/standard della produzione (azure_tts.py,
marcello-v1) una batteria di frasi che coprono TUTTE le insicurezze emerse
dall'audit paranoico (docs/audit/audit-report.md §5):
  - sigle compitate (SGIA, EnPI/EnB/SEU, RTS, HACCP, SGSSL, SGSI, SGPC, ...)
  - incoerenze glossario tra corsi (PDCA 9001 vs altri, SGQ)
  - numeri di norma in cifre vs compitati (45001 vs 19011)
  - numeri di clausola in cifre (punto 9.1)
  - omografi (subito/subìto, principi, ancora)
  - forestierismi tenuti (briefing, leadership, follow up, energy manager, ...)

Dove possibile le frasi sono estratte DAI COPIONI REALI del corso, così
l'ascolto giudica esattamente ciò che andrà in produzione. Ogni frase passa
per il glossario del SUO corso via con_glossario() (stessa lista bianca dura).

Output: produzione/test-pronuncia/<nome>.wav + manifest.md (cosa ascoltare).
Uso:  python scripts/produzione/test_pronuncia.py [--dry-run]
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

OUT = PROD / "test-pronuncia"


def frasi(testo: str) -> list[str]:
    return [f.strip() for f in re.split(r"(?<=[.!?])\s+", testo) if f.strip()]


def estrai(corso: str, target: list[str], per_target: int = 1, max_parole: int = 45) -> str:
    """Frasi reali dei copioni del corso contenenti ogni target (prime occorrenze)."""
    cop = leggi_json(PROD / corso / "copioni.json")
    out: list[str] = []
    viste: set[str] = set()
    for t in target:
        patt = re.compile(r"(?<![A-Za-zà-ùÀ-Ù])" + re.escape(t) + r"(?![A-Za-zà-ùÀ-Ù])")
        n = 0
        for s in cop["slides"]:
            for f in frasi(s["testo"]):
                if patt.search(f) and len(f.split()) <= max_parole and f not in viste:
                    out.append(f)
                    viste.add(f)
                    n += 1
                    if n >= per_target:
                        break
            if n >= per_target:
                break
        if n == 0:
            print(f"  ATTENZIONE: nessuna frase reale per {t!r} in {corso} (salto il target)")
    return " ".join(out)


def batteria() -> list[dict]:
    B: list[dict] = []

    def add(nome: str, corso: str, testo: str, check: str) -> None:
        if testo.strip():
            B.append({"nome": nome, "corso": corso, "testo": testo, "check": check})
        else:
            print(f"  ATTENZIONE: {nome} vuoto, escluso dalla batteria")

    # --- 42001: SGIA (criterio utente) + IA/AI ---
    add("01-42001-sgia", "42001", estrai("42001", ["SGIA"], per_target=3),
        "SGIA deve suonare 'esse gi i a' OPPURE 'esse gi a' — MAI impastato 'esse gi ia a'")
    add("02-42001-ia-elisioni", "42001",
        estrai("42001", ["l'IA", "dell'IA", "sull'IA"]),
        "elisioni fluide: 'la i a', 'della i a', 'sulla i a' — nessun inciampo")
    add("03-42001-ai-act-sigle", "42001",
        estrai("42001", ["AI Act", "API"]),
        "'ei ai act' naturale; API='a pi i' (LLM/GDPR/GPU mai in voce: solo rete di sicurezza)")

    # --- 50001: sigle energia ---
    add("04-50001-enpi-enb-seu", "50001", estrai("50001", ["EnPI", "EnB", "SEU"], per_target=2),
        "EnPI='en pi ai', EnB='en bi', SEU='esse e u' — lettere pulite, niente fusioni")
    add("05-50001-sge", "50001", estrai("50001", ["SGE"], per_target=2),
        "SGE='esse gi e' anche con elisione (l'SGE -> 'l'esse gi e'); EGE/ESCo/tep/MWh mai in voce")
    add("06-50001-unita-energia", "50001", estrai("50001", ["kWh"], per_target=2),
        "kWh='chilowattora' per esteso, senza sillabe mangiate (unica unità-simbolo presente in voce)")

    # --- 39001: sigle strada ---
    add("07-39001-rts", "39001", estrai("39001", ["RTS"], per_target=3),
        "RTS='erre ti esse' sempre nitido, anche ripetuto più volte nella stessa frase")
    add("08-39001-sigle-strada", "39001",
        estrai("39001", ["CQC", "ADAS", "GPS"]),
        "CQC='ci cu ci', ADR='a di erre', ADAS='adas' (parola), ABS='a bi esse', GPS='gi pi esse' (ADR e ABS sono nelle stesse frasi di CQC/ADAS; km mai in voce)")

    # --- 27001 ---
    add("09-27001-sgsi-nis", "27001",
        estrai("27001", ["SGSI", "NIS", "ICT", "IT", "HR", "NC"], max_parole=60),
        "SGSI='esse gi esse i' (la i finale non si impasta); NIS='nis' (parola); ICT='i ci ti'; IT='i ti'; HR='acca erre'; NC='enne ci'")

    # --- 45001 ---
    add("10-45001-sgssl-dlgs", "45001",
        estrai("45001", ["SGSSL", "SSL", "DPI", "DVR", "OHSAS", "D.Lgs. 81/08"], max_parole=60),
        "SGSSL='esse gi esse esse elle' (doppia esse distinta); OHSAS='osas'; D.Lgs. 81/08='decreto legislativo ottantuno del duemila otto'")

    # --- 22000 ---
    add("11-22000-haccp-prp", "22000", estrai("22000", ["HACCP", "OPRP", "PRP", "CCP", "SGSA"]),
        "HACCP='acca ci ci pi'; OPRP/PRP/CCP distinguibili tra loro; SGSA='esse gi esse a'")
    add("12-22000-schemi", "22000",
        estrai("22000", ["FSSC 22000", "GFSI", "BRCGS"], max_parole=65),
        "FSSC='effe esse esse ci' + 22000 in cifre; GFSI='gi effe esse i'; BRCGS='bi erre ci gi esse' (RASFF/UFC mai in voce)")

    # --- 37001 ---
    add("13-37001-sgpc", "37001",
        estrai("37001", ["SGPC", "KPI"], per_target=2),
        "SGPC='esse gi pi ci'; KPI='cappa pi i' (OCSE/ANAC/UNCAC/FCPA/CdA mai in voce: solo rete di sicurezza)")

    # --- 14001 ---
    add("14-14001-sga-simboli", "14001",
        estrai("14001", ["SGA", "EMAS", "pH"], max_parole=60),
        "SGA='esse gi a'; EMAS parola naturale; pH='pi acca' (CO2/dB mai in voce)")

    # --- 9001: incoerenze glossario (P D C A e S G Q grezzi) ---
    add("15-9001-sgq-pdca-reali", "9001", estrai("9001", ["SGQ", "PDCA"], per_target=2),
        "INCOERENZA DA GIUDICARE: 9001 rende SGQ='S G Q' e PDCA='P D C A' (lettere grezze) — la Q deve dire 'cu'")
    add("16-pdca-9001-grezzo", "9001",
        "Il ciclo PDCA guida il miglioramento continuo, e ogni fase del PDCA lascia evidenze verificabili.",
        "CONFRONTO A/B con il file 17: stessa frase, resa 9001 'P D C A'")
    add("17-pdca-14001-fonetico", "14001",
        "Il ciclo PDCA guida il miglioramento continuo, e ogni fase del PDCA lascia evidenze verificabili.",
        "CONFRONTO A/B con il file 16: resa fonetica 'pi di ci a' — se suonano diversi, si allinea il glossario 9001")

    # --- numeri di norma: compitati (19011) vs cifre (45001) ---
    add("18-19011-numeri-compitati", "19011",
        estrai("19011", ["ISO 19011", "ISO 9001", "ISO 45001"]),
        "resa compitata dal glossario 19011: 'diciannove milaundici', 'nove milauno', 'quarantacinque milauno'")
    add("19-45001-numeri-in-cifre", "45001",
        estrai("45001", ["ISO 45001", "ISO 9001"]) +
        " Il punto 9.1 della norma richiede il monitoraggio, e il punto 10 chiede il miglioramento.",
        "QUI le cifre restano cifre: come legge Marcello '45001'? E 'punto 9.1' ('nove punto uno'?) — confronto col file 18")

    # --- omografi ---
    add("20-omografi", "9001",
        "Appena ricevuto il rilievo, il responsabile ha subito avviato la correzione. "
        "Il ritardo subìto dal cliente è stato documentato con cura. "
        "I principi della norma restano stabili nel tempo, mentre l'analisi è ancora in corso.",
        "1° 'subito'=avverbio (sùbito); 'subìto'=participio; 'principi'=princìpi (non prìncipi); 'ancora'=avverbio (ancóra)")

    # --- forestierismi ---
    add("21-forestierismi-audit", "19011",
        estrai("19011", ["briefing", "leadership", "follow up"]),
        "pronuncia inglese naturale ma non caricata; 'follow up' senza pausa innaturale tra le due parole")
    add("22-forestierismi-energia", "50001",
        estrai("50001", ["energy manager", "set point", "facility", "stand by", "backup"]),
        "resa dei forestierismi del dominio energia: comprensibili, non storpiati in italiano")

    return B


def main() -> None:
    dry = "--dry-run" in sys.argv
    env = carica_env()
    B = batteria()

    # prepara testi glossariati (la lista bianca dura scatta QUI, prima del job)
    per_corso_gloss: dict[str, dict] = {}
    for item in B:
        c = item["corso"]
        if c not in per_corso_gloss:
            per_corso_gloss[c] = leggi_json(PROD / c / "glossario-tts.json", {"map": {}})
        item["parlato"] = con_glossario(item["testo"], per_corso_gloss[c])

    print(f"batteria: {len(B)} clip · {sum(len(i['parlato']) for i in B)} caratteri totali")
    for i in B:
        print(f"  {i['nome']}  [{i['corso']}]  {len(i['testo'].split())} parole")
    if dry:
        for i in B:
            print(f"\n--- {i['nome']} ---\nSCRITTO: {i['testo']}\nPARLATO: {i['parlato']}")
        return

    tts = BatchTTS(env)
    ssml = [ssml_slide(i["parlato"], tts.voce, tts.cfg) for i in B]
    job_id = "test-pronuncia-" + hashlib.sha1("".join(ssml).encode()).hexdigest()[:8]
    print(f"job batch {job_id} → attendo la sintesi…")
    zip_bytes = tts.sintetizza(job_id, ssml, "Evalis test pronuncia sigle")

    OUT.mkdir(parents=True, exist_ok=True)
    righe = ["# Test pronuncia sigle — manifest d'ascolto",
             f"\nVoce: {tts.voce} · standard marcello-v1 · {len(B)} clip\n",
             "Per ogni clip: cosa verificare all'orecchio, il testo scritto e ciò che la voce vede.\n"]
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        for n, item in enumerate(B, start=1):
            dati = z.read(f"{n:04d}.wav")
            (OUT / f"{item['nome']}.wav").write_bytes(dati)
            d = durata_wav_bytes(dati)
            print(f"  {item['nome']}.wav · {d:.1f}s")
            righe += [f"\n## {item['nome']}.wav ({d:.0f}s, corso {item['corso']})",
                      f"**DA VERIFICARE:** {item['check']}",
                      f"\n> SCRITTO: {item['testo']}",
                      f"\n> LA VOCE VEDE: {item['parlato']}"]
    (OUT / "manifest.md").write_text("\n".join(righe) + "\n", encoding="utf-8")
    print(f"\nfatto → {OUT}\\  (ascolta i wav con manifest.md a fianco)")


if __name__ == "__main__":
    main()
