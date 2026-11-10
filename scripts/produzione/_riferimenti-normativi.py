#!/usr/bin/env python3
"""Controllo dei riferimenti normativi dei copioni (corsi giuridici: 231, privacy…).

Per ogni slide cerca nel parlato le leggi («decreto legislativo 231 del 2001», «legge 190 del 2012»…), le
sentenze («Cassazione numero 23401 del 2022») e gli articoli con suffisso («articolo 25 septies», «articolo 648
ter punto 1») e verifica che ciascuno compaia nella fonte del corso: _fonte/mNN.txt (materiale del committente
+ testo di legge vigente in coda) e testonorme/ISO<corso>.txt. Ciò che non si trova è un riferimento che il
modello ha aggiunto da sé: va verificato a mano prima del LOCK (non è per forza sbagliato, ma non è garantito).

Uso: python scripts/produzione/_riferimenti-normativi.py <corso> [--bozze]
  --bozze  controlla produzione/<corso>/_bozze/*.json invece di copioni.json
Esce con 1 se resta almeno un riferimento non trovato.
"""
import json, re, sys
from pathlib import Path

corso = sys.argv[1]
P = Path("produzione") / corso
fonte = "\n".join(f.read_text(encoding="utf-8") for f in sorted((P / "_fonte").glob("m*.txt")))
norma = Path(f"testonorme/ISO{corso}.txt")
if norma.exists():
    fonte += "\n" + norma.read_text(encoding="utf-8")
F = re.sub(r"\s+", " ", fonte)

if "--bozze" in sys.argv:
    slides = [s for f in sorted((P / "_bozze").glob("m*.json")) for s in json.loads(f.read_text(encoding="utf-8"))["slides"]]
else:
    slides = json.loads((P / "copioni.json").read_text(encoding="utf-8"))["slides"]

TIPI = {"decreto legislativo": r"(?:D\.\s?Lgs\.|decreto legislativo)", "legge": r"(?:L\.|[Ll]egge)",
        "decreto legge": r"(?:D\.\s?L\.|decreto[- ]legge)", "decreto del Presidente della Repubblica": r"(?:D\.?P\.?R\.?)"}
SUFF = ("bis|ter|quater|quinquies|sexies|septies|octies|novies|decies|undecies|duodecies|terdecies|quaterdecies|"
        "quinquiesdecies|sexiesdecies|septiesdecies|duodevicies|undevicies|vicies|[a-z]+ies")  # l'ultima prende anche i suffissi inventati


def legge_in_fonte(tipo, n, anno):
    aa = anno[2:]
    pat = rf"{TIPI[tipo]}\s?(?:n\.\s?)?{n}\s?/\s?(?:{anno}|{aa})\b|{n}/{anno}\b|{n} del {anno}\b"
    return re.search(pat, F) is not None or re.search(rf"\b{anno},? n\. ?{n}\b", F) is not None


def articolo_in_fonte(n, suff, punto):
    forma = f"{n}-{suff}" + (f".{punto}" if punto else "")
    return re.search(rf"\b{re.escape(forma)}\b", F) is not None or re.search(rf"\b{n} {suff}" + (rf"\.{punto}" if punto else r"\b"), F) is not None


problemi = []
for s in slides:
    t = s["testo"]
    for tipo, n, anno in re.findall(r"\b(decreto legislativo|decreto legge|legge|decreto del Presidente della Repubblica) (\d+) del (\d{4})\b", t, re.I):
        if not legge_in_fonte(tipo.lower(), n, anno):
            problemi.append((s["id"], f"{tipo} {n} del {anno}"))
    for n, anno in re.findall(r"\b(?:Cassazione|sentenza|sentenze)\b[^.;:]{0,80}?\b(?:numero )?(\d{3,5}) del (\d{4})\b", t):
        if not re.search(rf"\b{n}/{anno}\b|\b{n} del {anno}\b", F):
            problemi.append((s["id"], f"sentenza {n} del {anno}"))
    for n, suff, punto in re.findall(rf"\barticol[oi] (\d+) ({SUFF})(?: punto (\d))?\b", t):
        if not articolo_in_fonte(n, suff, punto):
            problemi.append((s["id"], f"articolo {n} {suff}" + (f" punto {punto}" if punto else "")))
    for n, suff, punto in re.findall(rf"(?:\b[ei]l |\bal |\bdal |\bnel |\bdel |, )(\d+) ({SUFF})(?: punto (\d))?\b", t):
        if not articolo_in_fonte(n, suff, punto):
            problemi.append((s["id"], f"{n} {suff}" + (f" punto {punto}" if punto else "")))

visti = {}
for sid, rif in problemi:
    visti.setdefault(rif, []).append(sid)
for rif, ids in sorted(visti.items()):
    print(f"NON IN FONTE: {rif}  ({len(ids)}×: {', '.join(ids[:4])}{' …' if len(ids) > 4 else ''})")
print(f"{corso}: {len(slides)} slide controllate · {len(visti)} riferimenti non trovati nella fonte")
sys.exit(1 if visti else 0)
