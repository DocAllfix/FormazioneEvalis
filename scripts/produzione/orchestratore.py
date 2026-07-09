#!/usr/bin/env python3
"""Orchestratore copioni — Fabbrica v3 (docs/produzione-corsi/ORCHESTRATORE.md).

Genera i moduli di un corso via Azure OpenAI (GPT-5) in PARALLELO tra moduli,
sequenziale dentro il modulo (blocchi ~10 slide + banca checkpoint). Per ogni
bozza fa girare i gate nel loop: lint E1-E9 + quiz-lint + spellcheck su una
STAGING ROOT (mai su copioni.json reale), poi il revisore semantico
(REVISIONE-MERITO.md) contro la stessa sezione di norma. Esito finale per
modulo: PRONTO_REVISIONE (tocca al livello 3, l'occhio umano) o ROSSO_MANUALE.

Il merge in copioni.json resta un passo umano DOPO la revisione di merito:
  node scripts/produzione/merge-bozza.mjs <corso> <mNN>

Stato = file (idempotente, riparte da dove si era fermato):
  produzione/<corso>/_bozze/<mNN>.json        bozza (atomica: tmp+rename)
  produzione/<corso>/_log/<mNN>.state.json    stato, giri, token, segnalazioni
  produzione/_staging/<corso>-<mNN>/          root usa-e-getta per i gate

Uso:
  python scripts/produzione/orchestratore.py <corso> [--moduli m01,m03]
         [--parallel 12] [--dry-run] [--init] [--report] [--smoke]
  --init    crea produzione/<corso>/copioni.json base dallo skeleton (budget compreso)
  --smoke   1 mini-completion di verifica credenziali/deployment (Fase 0)
  --report  stampa la tabella stati dai file _log/ e esce

Credenziali: .env.produzione (vedi .env.produzione.example). Richiede: pip install openai
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = Path(__file__).resolve().parents[2]
PROD = REPO / "produzione"
STAGING = PROD / "_staging"
PAROLE_AL_SECONDO = 2.35  # misurato (M1 19011 reale)
BLOCCO_SLIDE = 10         # slide per blocco di generazione
MAX_GIRI_FIX = 2          # giri di auto-correzione sui gate meccanici
MAX_GIRI_SEMANTICA = 1    # giri di correzione su segnalazioni semantiche alte


# ---------------------------------------------------------------- credenziali
def carica_env() -> dict[str, str]:
    env = {}
    f = REPO / ".env.produzione"
    if f.exists():
        for riga in f.read_text(encoding="utf-8").splitlines():
            riga = riga.strip()
            if riga and not riga.startswith("#") and "=" in riga:
                k, v = riga.split("=", 1)
                env[k.strip()] = v.strip()
    for k in list(env):  # l'ambiente reale vince sul file
        env[k] = os.environ.get(k, env[k])
    return env


def client_azure(env: dict[str, str]):
    from openai import AsyncAzureOpenAI
    mancanti = [k for k in ("AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY",
                            "AZURE_OPENAI_DEPLOYMENT") if not env.get(k)]
    if mancanti:
        sys.exit(f"credenziali mancanti in .env.produzione: {', '.join(mancanti)}")
    return AsyncAzureOpenAI(
        azure_endpoint=env["AZURE_OPENAI_ENDPOINT"],
        api_key=env["AZURE_OPENAI_API_KEY"],
        api_version=env.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
        max_retries=5,  # 429/5xx: backoff esponenziale dell'SDK
    )


# ---------------------------------------------------------------- skeleton
RIGA_MOD = re.compile(r"\|\s*M(\d+)\s*\|([^|]+)\|([^|]+)\|\s*(\d+)\s*min\s*\|\s*(\d+)\s*\|")


def leggi_skeleton(corso: str) -> dict[str, dict]:
    """{mNN: {titolo, copre, minuti, nSlide}} dalla tabella di struttura.md."""
    md = (PROD / corso / "struttura.md").read_text(encoding="utf-8")
    mod = {}
    for m in RIGA_MOD.finditer(md):
        n = int(m.group(1))
        mod[f"m{n:02d}"] = {
            "titolo": m.group(2).strip().replace("*", ""),
            "copre": m.group(3).strip(),
            "minuti": int(m.group(4)),
            "nSlide": int(m.group(5)),
        }
    if not mod:
        sys.exit(f"nessun modulo nella tabella di produzione/{corso}/struttura.md")
    return mod


def init_copioni(corso: str) -> None:
    """copioni.json base dallo skeleton (budget con minutiPerModulo) — Fase 3 passo 2."""
    dest = PROD / corso / "copioni.json"
    if dest.exists():
        print(f"{dest} esiste già: non lo tocco"); return
    mod = leggi_skeleton(corso)
    md = (PROD / corso / "struttura.md").read_text(encoding="utf-8")
    tot = sum(v["minuti"] for v in mod.values())
    legali = 1440 if tot >= 1400 else 960  # 24h o 16h dal monte-ore skeleton
    m_leg = re.search(r"(\d+)\s*(?:min(?:uti)?)\s+legali", md, re.I)
    if m_leg:
        legali = int(m_leg.group(1))
    base = {
        "corso": corso,
        "titolo": f"Auditor ISO {corso}",
        "budget": {
            "paroleAlSecondoProvvisorio": PAROLE_AL_SECONDO,
            "minutiLegali": legali,
            "minutiPerModulo": {k: v["minuti"] for k, v in mod.items()},
        },
        "slides": [],
        "checkpoint": {},
    }
    scrivi_atomico(dest, json.dumps(base, ensure_ascii=False, indent=2) + "\n")
    print(f"creato {dest} — {len(mod)} moduli, {tot} min skeleton, {legali} min legali")


# ---------------------------------------------------------------- util file
def scrivi_atomico(path: Path, testo: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(testo, encoding="utf-8")
    tmp.replace(path)


def leggi_json(path: Path, fallback=None):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def stato_path(corso: str, mod: str) -> Path:
    return PROD / corso / "_log" / f"{mod}.state.json"


def salva_stato(corso: str, mod: str, st: dict) -> None:
    st["aggiornato"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    scrivi_atomico(stato_path(corso, mod), json.dumps(st, ensure_ascii=False, indent=2) + "\n")


# ---------------------------------------------------------------- pacchetto
def genera_pacchetto(corso: str, mod: str) -> str:
    r = subprocess.run(["node", "scripts/produzione/gen-pacchetto.mjs", corso, mod],
                       cwd=REPO, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise RuntimeError(f"gen-pacchetto {mod}: {r.stderr.strip() or r.stdout.strip()}")
    return (PROD / corso / "_pacchetti" / f"{mod}.md").read_text(encoding="utf-8")


def sezione_norma(pacchetto: str) -> str:
    return pacchetto.split("## LA SEZIONE DELLA NORMA", 1)[-1].split("\n", 1)[-1].strip()


def blocco_skeleton(pacchetto: str) -> str:
    m = re.search(r"## Struttura del modulo.*?\n(.*?)\n## ", pacchetto, re.S)
    return m.group(1).strip() if m else ""


# ---------------------------------------------------------------- gate (staging)
def gate_meccanici(corso: str, mod: str, bozza: dict) -> tuple[bool, str]:
    """lint+spellcheck sulla bozza mergiata in una staging root. (ok, report_errori)."""
    root = STAGING / f"{corso}-{mod}"
    if root.exists():
        shutil.rmtree(root)
    sc = root / corso
    sc.mkdir(parents=True)
    # copioni reale + bozza mergiata in memoria (mai su file reale)
    cop = leggi_json(PROD / corso / "copioni.json")
    if cop is None:
        raise RuntimeError(f"manca produzione/{corso}/copioni.json — lancia prima --init")
    cop = json.loads(json.dumps(cop))  # copia profonda
    # la bozza SOSTITUISCE l'eventuale versione già mergiata del modulo: i gate
    # devono giudicare il testo della bozza, mai quello vecchio
    cop["slides"] = [s for s in cop["slides"] if not s["id"].startswith(f"{corso}_{mod}_")]
    cop["slides"] += bozza["slides"]
    cop.setdefault("checkpoint", {})[mod] = bozza["checkpoint"]
    (sc / "copioni.json").write_text(json.dumps(cop, ensure_ascii=False, indent=2), encoding="utf-8")
    for nome in ("glossario-tts.json", "copertura.json"):
        src = PROD / corso / nome
        if src.exists():
            shutil.copy2(src, sc / nome)

    env = {**os.environ, "PRODUZIONE_ROOT": str(root)}
    report = []
    ok = True
    for cmd in (["node", "scripts/produzione/lint-copioni.mjs", corso, "--modulo", mod],
                [sys.executable, "scripts/produzione/spellcheck.py", corso, "--modulo", mod]):
        r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True,
                           encoding="utf-8", env=env)
        if r.returncode != 0:
            ok = False
        report.append(r.stdout + r.stderr)
    righe_err = [l for rep in report for l in rep.splitlines()
                 if re.match(r"\s*ERRORE\s+\S", l)]
    return ok, "\n".join(righe_err) if righe_err else "\n".join(report)[-4000:]


# ---------------------------------------------------------------- schema JSON (strict)
def schema_slides(nome: str) -> dict:
    return {"type": "json_schema", "json_schema": {"name": nome, "strict": True, "schema": {
        "type": "object", "additionalProperties": False,
        "required": ["slides"],
        "properties": {"slides": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["id", "titolo", "budgetParole", "testo"],
            "properties": {"id": {"type": "string"}, "titolo": {"type": "string"},
                           "budgetParole": {"type": "integer"}, "testo": {"type": "string"}},
        }}}}}}


SCHEMA_BANCA = {"type": "json_schema", "json_schema": {"name": "banca", "strict": True, "schema": {
    "type": "object", "additionalProperties": False,
    "required": ["banca"],
    "properties": {"banca": {"type": "array", "items": {
        "type": "object", "additionalProperties": False,
        "required": ["q", "opzioni", "corretta", "tipo", "slide"],
        "properties": {"q": {"type": "string"},
                       "opzioni": {"type": "array", "items": {"type": "string"}},
                       "corretta": {"type": "integer"},
                       "tipo": {"type": "string", "enum": ["riconoscimento", "comprensione", "applicazione"]},
                       "slide": {"type": "string"}}}}}}}}

SCHEMA_FIX = {"type": "json_schema", "json_schema": {"name": "fix", "strict": True, "schema": {
    "type": "object", "additionalProperties": False,
    "required": ["slides", "banca"],
    "properties": {
        "slides": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["id", "titolo", "budgetParole", "testo"],
            "properties": {"id": {"type": "string"}, "titolo": {"type": "string"},
                           "budgetParole": {"type": "integer"}, "testo": {"type": "string"}}}},
        "banca": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["q", "opzioni", "corretta", "tipo", "slide"],
            "properties": {"q": {"type": "string"},
                           "opzioni": {"type": "array", "items": {"type": "string"}},
                           "corretta": {"type": "integer"},
                           "tipo": {"type": "string", "enum": ["riconoscimento", "comprensione", "applicazione"]},
                           "slide": {"type": "string"}}}}}}}}

SCHEMA_REVISIONE = {"type": "json_schema", "json_schema": {"name": "revisione", "strict": True, "schema": {
    "type": "object", "additionalProperties": False,
    "required": ["modulo", "esito", "segnalazioni"],
    "properties": {"modulo": {"type": "string"},
                   "esito": {"type": "string", "enum": ["PULITO", "DA_CORREGGERE"]},
                   "segnalazioni": {"type": "array", "items": {
                       "type": "object", "additionalProperties": False,
                       "required": ["slide", "gravita", "problema", "riferimento_norma"],
                       "properties": {"slide": {"type": "string"},
                                      "gravita": {"type": "string", "enum": ["alta", "media"]},
                                      "problema": {"type": "string"},
                                      "riferimento_norma": {"type": "string"}}}}}}}}


# ---------------------------------------------------------------- chiamate modello
class Modello:
    def __init__(self, client, env: dict[str, str], usage: dict):
        self.client = client
        self.deployment = env["AZURE_OPENAI_DEPLOYMENT"]
        self.effort = env.get("AZURE_OPENAI_REASONING_EFFORT", "")
        self.usage = usage

    async def chiama(self, messaggi: list[dict], response_format: dict,
                     max_tokens: int = 32000) -> dict:
        kw = dict(model=self.deployment, messages=messaggi,
                  response_format=response_format, max_completion_tokens=max_tokens)
        if self.effort:
            kw["reasoning_effort"] = self.effort
        r = await self.client.chat.completions.create(**kw)
        u = r.usage
        self.usage["input"] += u.prompt_tokens
        self.usage["output"] += u.completion_tokens
        self.usage["chiamate"] += 1
        if r.choices[0].finish_reason == "length":
            raise RuntimeError("output troncato (max_completion_tokens): alzare il limite")
        return json.loads(r.choices[0].message.content)


NOTA_CANALE = (
    "NOTA OPERATIVA per questa modalità API: ignora ogni istruzione del pacchetto su file, "
    "Write o salvataggi — il tuo UNICO canale di output è la risposta JSON nello schema "
    "richiesto. Tutte le regole di CONTENUTO, FORMA e LUNGHEZZA del pacchetto restano "
    "pienamente vincolanti."
)


async def genera_blocchi(mdl: Modello, corso: str, mod: str, pacchetto: str,
                         n_slide: int) -> list[dict]:
    """Blocchi sequenziali (~10 slide): ogni blocco vede le slide già scritte."""
    slides: list[dict] = []
    inizio = 1
    blocco_n = 0
    n_blocchi = (n_slide + BLOCCO_SLIDE - 1) // BLOCCO_SLIDE
    while inizio <= n_slide:
        fine = min(inizio + BLOCCO_SLIDE - 1, n_slide)
        blocco_n += 1
        ids = [f"{corso}_{mod}_s{i:03d}" for i in range(inizio, fine + 1)]
        precedenti = "\n\n".join(
            f"### {s['id']} — {s['titolo']}\n{s['testo']}" for s in slides) or "(nessuna: sei all'inizio)"
        istruzione = (
            f"{NOTA_CANALE}\n\n"
            f"Scrivi ORA il blocco {blocco_n} di {n_blocchi}: le slide da {ids[0]} a {ids[-1]} "
            f"(tutte, nessuna esclusa), seguendo lo skeleton e riprendendo il filo dalle slide "
            f"già scritte, senza ripeterne i contenuti.\n\n"
            f"SLIDE GIÀ SCRITTE DEI BLOCCHI PRECEDENTI (per continuità e anti-ripetizione):\n{precedenti}"
        )
        out = await mdl.chiama(
            [{"role": "system", "content": "Sei l'autore dei copioni della fabbrica corsi: rispetti ogni regola del pacchetto."},
             {"role": "user", "content": pacchetto},   # prefisso stabile → prompt caching
             {"role": "user", "content": istruzione}],
            schema_slides(f"blocco_{mod}"))
        avuti = {s["id"]: s for s in out["slides"]}
        if sorted(avuti) != sorted(ids):
            raise RuntimeError(f"blocco {blocco_n}: ID attesi {ids[0]}..{ids[-1]}, "
                               f"ricevuti {sorted(avuti)[:3]}…")
        slides += [avuti[i] for i in ids]
        inizio = fine + 1
    return slides


async def genera_banca(mdl: Modello, mod: str, pacchetto: str, slides: list[dict]) -> dict:
    testo_slides = "\n\n".join(f"### {s['id']} — {s['titolo']}\n{s['testo']}" for s in slides)
    out = await mdl.chiama(
        [{"role": "system", "content": "Sei l'autore dei quiz della fabbrica corsi: segui QUIZ-STANDARD alla lettera."},
         {"role": "user", "content": pacchetto},
         {"role": "user", "content": f"{NOTA_CANALE}\n\nIl modulo è scritto. Scrivi ORA la banca "
          f"checkpoint (almeno dieci domande, mix quaranta-quaranta-venti, campo slide = sNNN "
          f"della slide che giustifica la risposta).\n\nSLIDE DEL MODULO:\n{testo_slides}"}],
        SCHEMA_BANCA, max_tokens=16000)
    return {"modulo": mod, "estrazione": 5, "soglia": 0.8, "banca": out["banca"]}


async def correggi(mdl: Modello, pacchetto: str, bozza: dict, report: str, origine: str) -> dict:
    """Un giro di fix mirato: il modello restituisce SOLO slide/domande corrette."""
    testo_slides = "\n\n".join(f"### {s['id']} — {s['titolo']}\n{s['testo']}" for s in bozza["slides"])
    out = await mdl.chiama(
        [{"role": "system", "content": "Sei l'autore del modulo: correggi le violazioni segnalate senza riscrivere ciò che è sano."},
         {"role": "user", "content": pacchetto},
         {"role": "user", "content":
          f"{NOTA_CANALE}\n\nIl tuo modulo ha violazioni segnalate da {origine}. Correggi SOLO "
          f"le slide e le domande coinvolte, mantenendo budget parole e regole del pacchetto. "
          f"Restituisci nello schema: in slides le sole slide corrette (intere), in banca la "
          f"banca INTERA corretta se una domanda era coinvolta, altrimenti banca vuota.\n\n"
          f"SEGNALAZIONI:\n{report}\n\nSLIDE ATTUALI:\n{testo_slides}\n\n"
          f"BANCA ATTUALE:\n{json.dumps(bozza['checkpoint']['banca'], ensure_ascii=False)}"}],
        SCHEMA_FIX)
    per_id = {s["id"]: s for s in out["slides"]}
    bozza["slides"] = [per_id.get(s["id"], s) for s in bozza["slides"]]
    if out["banca"]:
        bozza["checkpoint"]["banca"] = out["banca"]
    return bozza


async def revisione_semantica(mdl: Modello, mod: str, contratto: str, norma: str,
                              skeleton: str, bozza: dict) -> dict:
    testo_slides = "\n\n".join(f"### {s['id']} — {s['titolo']}\n{s['testo']}" for s in bozza["slides"])
    return await mdl.chiama(
        [{"role": "system", "content": "Sei il revisore semantico della fabbrica corsi: leggi e segnali, non riscrivi. Non inventare problemi: un modulo può essere pulito."},
         {"role": "user", "content": f"{contratto}\n\n## LA SEZIONE DELLA NORMA (fonte di verità)\n{norma}\n\n"
          f"## BLOCCHI CHE IL MODULO DOVEVA COPRIRE\n{skeleton}\n\n"
          f"## IL MODULO DA REVISIONARE ({mod}, slide per slide, nessuna esclusa)\n{testo_slides}"}],
        SCHEMA_REVISIONE, max_tokens=16000)


# ---------------------------------------------------------------- pipeline modulo
async def lavora_modulo(mdl_factory, corso: str, mod: str, info: dict,
                        sem: asyncio.Semaphore, contratto_rev: str) -> dict:
    async with sem:
        st = leggi_json(stato_path(corso, mod), {"modulo": mod, "giri_fix": 0,
                        "usage": {"input": 0, "output": 0, "chiamate": 0}})
        mdl = mdl_factory(st["usage"])
        t0 = time.time()
        try:
            # idempotenza: già mergiato o già pronto → non si rifà
            cop = leggi_json(PROD / corso / "copioni.json", {"slides": []})
            if any(s["id"].startswith(f"{corso}_{mod}_") for s in cop["slides"]):
                st["stato"] = "MERGIATO"; salva_stato(corso, mod, st); return st
            if st.get("stato") == "PRONTO_REVISIONE" and (PROD / corso / "_bozze" / f"{mod}.json").exists():
                return st

            pacchetto = genera_pacchetto(corso, mod)
            norma = sezione_norma(pacchetto)
            skeleton = blocco_skeleton(pacchetto)

            bozza_path = PROD / corso / "_bozze" / f"{mod}.json"
            bozza = leggi_json(bozza_path)
            if not (bozza and len(bozza.get("slides", [])) == info["nSlide"]
                    and bozza.get("checkpoint", {}).get("banca")):
                print(f"[{mod}] genero {info['nSlide']} slide in blocchi…")
                slides = await genera_blocchi(mdl, corso, mod, pacchetto, info["nSlide"])
                checkpoint = await genera_banca(mdl, mod, pacchetto, slides)
                bozza = {"modulo": mod, "slides": slides, "checkpoint": checkpoint}
                scrivi_atomico(bozza_path, json.dumps(bozza, ensure_ascii=False, indent=2) + "\n")
            else:
                print(f"[{mod}] bozza esistente completa: riparto dai gate")

            # gate meccanici, con giri di fix
            ok, report = gate_meccanici(corso, mod, bozza)
            while not ok and st["giri_fix"] < MAX_GIRI_FIX:
                st["giri_fix"] += 1
                print(f"[{mod}] gate ROSSI → giro di fix {st['giri_fix']}")
                bozza = await correggi(mdl, pacchetto, bozza, report, "i gate meccanici (lint e ortografia)")
                scrivi_atomico(bozza_path, json.dumps(bozza, ensure_ascii=False, indent=2) + "\n")
                ok, report = gate_meccanici(corso, mod, bozza)
            if not ok:
                st.update(stato="ROSSO_MANUALE", gate_report=report[-3000:])
                salva_stato(corso, mod, st)
                print(f"[{mod}] ROSSO dopo {MAX_GIRI_FIX} fix: in coda manuale")
                return st

            # revisore semantico, con giro di correzione sulle gravità alte
            rev = await revisione_semantica(mdl, mod, contratto_rev, norma, skeleton, bozza)
            st["semantica"] = rev
            giri_sem = 0
            while rev["esito"] == "DA_CORREGGERE" and any(
                    s["gravita"] == "alta" for s in rev["segnalazioni"]) and giri_sem < MAX_GIRI_SEMANTICA:
                giri_sem += 1
                print(f"[{mod}] semantica DA_CORREGGERE ({sum(1 for s in rev['segnalazioni'] if s['gravita']=='alta')} alte) → correzione")
                bozza = await correggi(mdl, pacchetto, bozza,
                                       json.dumps(rev["segnalazioni"], ensure_ascii=False, indent=1),
                                       "il revisore semantico")
                scrivi_atomico(bozza_path, json.dumps(bozza, ensure_ascii=False, indent=2) + "\n")
                ok, report = gate_meccanici(corso, mod, bozza)  # re-gate dopo la correzione
                if not ok:
                    st.update(stato="ROSSO_MANUALE", gate_report=report[-3000:])
                    salva_stato(corso, mod, st); return st
                rev = await revisione_semantica(mdl, mod, contratto_rev, norma, skeleton, bozza)
                st["semantica"] = rev
            if rev["esito"] == "DA_CORREGGERE" and any(s["gravita"] == "alta" for s in rev["segnalazioni"]):
                st["stato"] = "ROSSO_MANUALE"
            else:
                st["stato"] = "PRONTO_REVISIONE"  # tocca al livello 3 (occhio umano) → poi merge
            st["parole"] = sum(len(s["testo"].split()) for s in bozza["slides"])
            st["durata_s"] = round(time.time() - t0)
            salva_stato(corso, mod, st)
            print(f"[{mod}] {st['stato']} — {st['parole']} parole, "
                  f"{st['usage']['chiamate']} chiamate, {st['durata_s']}s")
            return st
        except Exception as e:  # il circuito si apre sul modulo, non sulla wave
            st.update(stato="ERRORE", errore=str(e)[:500])
            salva_stato(corso, mod, st)
            print(f"[{mod}] ERRORE: {e}")
            return st


# ---------------------------------------------------------------- report
def report_corso(corso: str, moduli: list[str]) -> None:
    print(f"\n=== REPORT {corso} ===")
    print(f"{'mod':4} {'stato':18} {'parole':>7} {'fix':>3} {'sem.alta':>8} {'sem.media':>9} {'tok.in':>9} {'tok.out':>8}")
    for mod in moduli:
        st = leggi_json(stato_path(corso, mod))
        if not st:
            print(f"{mod:4} {'—':18}"); continue
        seg = st.get("semantica", {}).get("segnalazioni", [])
        u = st.get("usage", {})
        print(f"{mod:4} {st.get('stato','?'):18} {st.get('parole','—'):>7} "
              f"{st.get('giri_fix',0):>3} {sum(1 for s in seg if s['gravita']=='alta'):>8} "
              f"{sum(1 for s in seg if s['gravita']=='media'):>9} "
              f"{u.get('input',0):>9} {u.get('output',0):>8}")
    print("PRONTO_REVISIONE = tocca alla revisione umana, poi: node scripts/produzione/merge-bozza.mjs "
          f"{corso} <mNN>")


# ---------------------------------------------------------------- main
async def main() -> None:
    ap = argparse.ArgumentParser(description="Orchestratore copioni (Fabbrica v3)")
    ap.add_argument("corso")
    ap.add_argument("--moduli", help="es. m01,m03 (default: tutti dallo skeleton)")
    ap.add_argument("--parallel", type=int, default=12)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--init", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()

    skeleton = leggi_skeleton(a.corso)
    moduli = a.moduli.split(",") if a.moduli else list(skeleton)
    for m in moduli:
        if m not in skeleton:
            sys.exit(f"modulo {m} non nello skeleton di {a.corso}")

    if a.init:
        init_copioni(a.corso); return
    if a.report:
        report_corso(a.corso, moduli); return

    env = carica_env()
    if a.smoke:
        client = client_azure(env)
        r = await client.chat.completions.create(
            model=env["AZURE_OPENAI_DEPLOYMENT"], max_completion_tokens=2000,
            messages=[{"role": "user", "content": "Rispondi con la sola parola: pronto"}])
        print(f"smoke ok — deployment {env['AZURE_OPENAI_DEPLOYMENT']} → "
              f"{r.choices[0].message.content!r} (model: {r.model})")
        return
    if a.dry_run:
        print(f"{a.corso}: {len(moduli)} moduli, parallel={a.parallel}")
        for m in moduli:
            i = skeleton[m]
            print(f"  {m}: {i['nSlide']} slide, {i['minuti']} min, budget "
                  f"~{round(i['minuti']*60*PAROLE_AL_SECONDO)} parole — {i['titolo']}")
        return

    client = client_azure(env)
    contratto_rev = (REPO / "docs/produzione-corsi/REVISIONE-MERITO.md").read_text(encoding="utf-8")
    sem = asyncio.Semaphore(a.parallel)
    mdl_factory = lambda usage: Modello(client, env, usage)
    t0 = time.time()
    await asyncio.gather(*(lavora_modulo(mdl_factory, a.corso, m, skeleton[m], sem, contratto_rev)
                           for m in moduli))
    print(f"\nwave completata in {round(time.time()-t0)}s")
    report_corso(a.corso, moduli)


if __name__ == "__main__":
    asyncio.run(main())
