#!/usr/bin/env python3
"""Documento Word di approvazione per il committente, dallo skeleton di produzione
(produzione/<corso>/struttura.md): stessa carta intestata, stessi stili e stesse tabelle del
documento ISO 9001:2026 già consegnato (usato come modello: se ne clonano gli elementi e si
cambia solo il testo). Moduli, durate, slide e argomenti escono dallo skeleton, quindi ciò che
il committente approva è esattamente ciò che verrà prodotto.

Uso: python scripts/produzione/_skeleton-docx.py fadpdr125
"""
import copy
import re
import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn

REPO = Path(__file__).resolve().parents[2]
MODELLO = REPO / "docs/produzione-corsi/Evalis_Academy_ISO9001-2026_Approvazione.docx"

corso = sys.argv[1] if len(sys.argv) > 1 else sys.exit("Uso: _skeleton-docx.py <corso>")
md = (REPO / "produzione" / corso / "struttura.md").read_text(encoding="utf-8")

# moduli dalla tabella dello skeleton (stessa regex dell'orchestratore)
moduli = [
    {"n": int(m[0]), "titolo": m[1].strip(), "copre": m[2].strip(), "min": int(m[3]), "slide": int(m[4])}
    for m in re.findall(r"\|\s*M(\d+)\s*\|([^|]+)\|([^|]+)\|\s*(\d+)\s*min\s*\|\s*(\d+)\s*\|", md)
]
# argomenti slide per slide
blocchi = {
    int(n): re.findall(r"^- (.+)$", corpo, re.M)
    for n, corpo in re.findall(r"^### M(\d+) — [^\n]*\n((?:- [^\n]*\n?)+)", md, re.M)
}
for m in moduli:
    somma = sum(int(x) for x in re.findall(r"— (\d+) slide", "\n".join(blocchi.get(m["n"], []))))
    if somma != m["slide"]:
        sys.exit(f"M{m['n']}: blocchi {somma} slide, tabella {m['slide']}: skeleton incoerente")

TOT_MIN = sum(m["min"] for m in moduli)
TOT_SLIDE = sum(m["slide"] for m in moduli)

# colonna "Copertura della prassi": parti della UNI/PdR 125:2022 e del quadro di legge
COPERTURA = {
    1: "§0-4, Appendice A in sintesi; quadro di legge",
    2: "§5.1 fasce, §6.1 politiche, §6.2 pianificazione",
    3: "§6.3 piano strategico e temi, §6.4 sistema",
    4: "§5.1-5.7 aree, pesi, indicatori",
    5: "§5.1 punteggio, §5.6, §6.4.5-6.4.8, Appendice A",
    6: "benefici di legge, sorveglianza, D.Lgs. 96/2026",
}

doc = Document(str(MODELLO))
body = doc.element.body
el = list(body.iterchildren())
P = {  # prototipi dal documento modello (indici verificati sul modello)
    "titolo": el[0], "sottotitolo": el[1], "emesso": el[2], "vuoto": el[3], "testo": el[4],
    "intestazione": el[6], "tab_sintesi": el[7], "corsivo": el[8], "punto": el[12],
    "corso": el[20], "durata": el[21], "tab_moduli": el[23], "modulo": el[26],
}
P = {k: copy.deepcopy(v) for k, v in P.items()}
sect = el[-1]
for e in el[:-1]:
    body.remove(e)


def par(proto: str, testo: str):
    p = copy.deepcopy(P[proto])
    runs = p.findall(qn("w:r"))
    for r in runs[1:]:
        p.remove(r)
    if runs:
        ts = runs[0].findall(qn("w:t"))
        for t in ts[1:]:
            runs[0].remove(t)
        if ts:
            ts[0].text = testo
            ts[0].set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    sect.addprevious(p)


def cella(c, testo: str):
    ps = c.findall(qn("w:p"))
    for extra in ps[1:]:
        c.remove(extra)
    p = ps[0]
    runs = p.findall(qn("w:r"))
    for r in runs[1:]:
        p.remove(r)
    ts = runs[0].findall(qn("w:t"))
    for t in ts[1:]:
        runs[0].remove(t)
    ts[0].text = testo
    ts[0].set("{http://www.w3.org/XML/1998/namespace}space", "preserve")


def tabella(proto: str, righe: list[list[str]]):
    t = copy.deepcopy(P[proto])
    trs = t.findall(qn("w:tr"))
    modello_riga = trs[1]
    for tr in trs[1:]:
        t.remove(tr)
    for x in trs[0].iter(qn("w:t")):  # intestazione: questa è una prassi, non una norma
        if x.text and "norma" in x.text:
            x.text = x.text.replace("norma", "prassi")
    for valori in righe:
        tr = copy.deepcopy(modello_riga)
        for c, v in zip(tr.findall(qn("w:tc")), valori):
            cella(c, v)
        t.append(tr)
    sect.addprevious(t)


titolo_corso = "PARITÀ DI GENERE UNI/PdR 125:2022 — DAL SISTEMA DI GESTIONE ALLA CERTIFICAZIONE"
par("titolo", "PROPOSTA DIDATTICA — CORSO PARITÀ DI GENERE UNI/PdR 125:2022")
par("sottotitolo", "EVALIS ACADEMY")
par("emesso", "EMESSO A OTTOBRE 2026 — BOZZA PER APPROVAZIONE")
par("vuoto", "")
par("testo", "Il presente documento raccoglie la struttura didattica del corso FAD-PDR125-01 sulla certificazione della "
    "parità di genere secondo la prassi di riferimento UNI/PdR 125:2022. Il corso nasce dal materiale didattico già "
    "redatto (due parti, ventidue sezioni, il caso ricorrente di Logistica Tifata) ed è verificato sul testo ufficiale "
    "della prassi pubblicato da UNI il 16 marzo 2022. Ogni slide è narrata dal relatore avatar, con lo stesso standard "
    "di voce, impaginazione e verifica dei corsi già in catalogo.")
par("vuoto", "")
par("intestazione", "Il corso in sintesi")
tabella("tab_sintesi", [["Parità di genere UNI/PdR 125:2022: dal sistema di gestione alla certificazione",
                         "8 ore", str(len(moduli)), str(TOT_SLIDE)]])
par("corsivo", f"Totale: 8 ore di formazione ({TOT_MIN} minuti di contenuti narrati per 480 minuti legali) · {TOT_SLIDE} slide.")
par("testo", "Ogni modulo è una lezione della piattaforma e si chiude con un checkpoint di verifica (quiz con domande "
    "estratte da banca dati, non conteggiato nel monte ore). Il corso si chiude con l'esame finale: 20 domande "
    "estratte da una banca di 32, soglia del 75% (15 su 20), costruito sulle domande del materiale didattico.")
par("vuoto", "")
par("intestazione", "Che cosa porta a casa chi frequenta il corso")
for punto in [
    "Collocare la prassi: che cos'è una prassi di riferimento UNI, come si certifica sotto accreditamento, quali leggi la circondano",
    "Classificare l'organizzazione nelle quattro fasce dimensionali e applicare le semplificazioni previste per le fasce 1 e 2",
    "Scrivere la politica di parità, nominare il comitato guida e redigere il piano strategico sui sei temi",
    "Leggere le sei aree e i trentatré indicatori, con i loro pesi, e calcolare il punteggio ponderato rispetto alla soglia del 60%",
    "Misurare l'equità remunerativa, a parità di livello, e raccordarla con la trasparenza retributiva del D.Lgs. 96/2026",
    "Preparare audit interno, revisione periodica e audit di certificazione; conoscere ciclo triennale e sorveglianza",
    "Ottenere e mantenere i benefici: esonero contributivo, punteggio premiale nelle gare, riduzione della garanzia",
    "Applicare tutto a un caso reale e ricorrente: dal piano al punteggio di Logistica Tifata",
]:
    par("punto", punto)
par("vuoto", "")
par("corso", titolo_corso)
par("durata", "Durata: 8 ore")
par("vuoto", "")
tabella("tab_moduli", [[f"M{m['n']}", m["titolo"], COPERTURA[m["n"]], f"{m['min']} min", str(m["slide"])] for m in moduli])
par("vuoto", "")
par("intestazione", "Argomenti per modulo (slide per slide)")
for m in moduli:
    par("modulo", f"M{m['n']} — {m['titolo']}   ({m['min']} minuti · {m['slide']} slide)")
    for b in blocchi[m["n"]]:
        par("punto", b)
par("vuoto", "")
par("intestazione", "Destinatari, verifiche e prezzo")
for punto in [
    "Destinatari: consulenti del lavoro, responsabili HR, consulenti di sistemi di gestione, auditor interni. Si dà per nota la struttura di un sistema di gestione ISO e l'amministrazione del personale",
    "Checkpoint: uno per modulo, bloccante, cinque domande estratte da una banca di almeno dieci, soglia 80%",
    "Esame finale: venti domande estratte da una banca di trentadue, soglia 75% (15 su 20)",
    "Area di catalogo: manageriale · Modalità: FAD asincrona con relatore avatar su ogni slide",
    "Prezzo: 300 € (prezzo di listino 549 €), IVA esclusa",
]:
    par("punto", punto)

for s in doc.sections:
    for p in s.footer.paragraphs:
        if p.runs:
            p.runs[0].text = "Parità di genere UNI/PdR 125:2022 — Evalis Academy"
            for r in p.runs[1:]:
                r.text = ""

out = REPO / "docs/produzione-corsi/Evalis_Academy_Parita_di_genere_PdR125_Approvazione.docx"
doc.save(str(out))
print(f"scritto {out.relative_to(REPO)} — {len(moduli)} moduli, {TOT_MIN} min, {TOT_SLIDE} slide")
