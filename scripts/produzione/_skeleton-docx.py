#!/usr/bin/env python3
"""Documento Word di approvazione per il committente, dallo skeleton di produzione
(produzione/<corso>/struttura.md): stessa carta intestata, stessi stili e stesse tabelle del
documento ISO 9001:2026 già consegnato (usato come modello: se ne clonano gli elementi e si
cambia solo il testo). Moduli, durate, slide e argomenti escono dallo skeleton, quindi ciò che
il committente approva è esattamente ciò che verrà prodotto.

Uso: python scripts/produzione/_skeleton-docx.py <corso>   (testi del corso in CORSI)
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

# testi propri di ogni corso: colonna di copertura (scritta a mano, corta), presentazione,
# obiettivi, destinatari e verifiche. Moduli, durate e argomenti escono sempre dallo skeleton.
CORSI = {
    "fadpdr125": {
        # parti della UNI/PdR 125:2022 e del quadro di legge
        "copertura": {
            1: "§0-4, Appendice A in sintesi; quadro di legge",
            2: "§5.1 fasce, §6.1 politiche, §6.2 pianificazione",
            3: "§6.3 piano strategico e temi, §6.4 sistema",
            4: "§5.1-5.7 aree, pesi, indicatori",
            5: "§5.1 punteggio, §5.6, §6.4.5-6.4.8, Appendice A",
            6: "benefici di legge, sorveglianza, D.Lgs. 96/2026",
        },
        "tipo_documento": "prassi",  # l'intestazione della tabella moduli del modello dice "norma"
        "titolo_corso": "PARITÀ DI GENERE UNI/PdR 125:2022 — DAL SISTEMA DI GESTIONE ALLA CERTIFICAZIONE",
        "titolo_doc": "PROPOSTA DIDATTICA — CORSO PARITÀ DI GENERE UNI/PdR 125:2022",
        "presentazione": "Il presente documento raccoglie la struttura didattica del corso FAD-PDR125-01 sulla certificazione della "
            "parità di genere secondo la prassi di riferimento UNI/PdR 125:2022. Il corso nasce dal materiale didattico già "
            "redatto (due parti, ventidue sezioni, il caso ricorrente di Logistica Tifata) ed è verificato sul testo ufficiale "
            "della prassi pubblicato da UNI il 16 marzo 2022. Ogni slide è narrata dal relatore avatar, con lo stesso standard "
            "di voce, impaginazione e verifica dei corsi già in catalogo.",
        "titolo_sintesi": "Parità di genere UNI/PdR 125:2022: dal sistema di gestione alla certificazione",
        "ore": 8,
        "verifiche": "Ogni modulo è una lezione della piattaforma e si chiude con un checkpoint di verifica (quiz con domande "
            "estratte da banca dati, non conteggiato nel monte ore). Il corso si chiude con l'esame finale: 20 domande "
            "estratte da una banca di 32, soglia del 75% (15 su 20), costruito sulle domande del materiale didattico.",
        "obiettivi": [
            "Collocare la prassi: che cos'è una prassi di riferimento UNI, come si certifica sotto accreditamento, quali leggi la circondano",
            "Classificare l'organizzazione nelle quattro fasce dimensionali e applicare le semplificazioni previste per le fasce 1 e 2",
            "Scrivere la politica di parità, nominare il comitato guida e redigere il piano strategico sui sei temi",
            "Leggere le sei aree e i trentatré indicatori, con i loro pesi, e calcolare il punteggio ponderato rispetto alla soglia del 60%",
            "Misurare l'equità remunerativa, a parità di livello, e raccordarla con la trasparenza retributiva del D.Lgs. 96/2026",
            "Preparare audit interno, revisione periodica e audit di certificazione; conoscere ciclo triennale e sorveglianza",
            "Ottenere e mantenere i benefici: esonero contributivo, punteggio premiale nelle gare, riduzione della garanzia",
            "Applicare tutto a un caso reale e ricorrente: dal piano al punteggio di Logistica Tifata",
        ],
        "dettagli": [
            "Destinatari: consulenti del lavoro, responsabili HR, consulenti di sistemi di gestione, auditor interni. Si dà per nota la struttura di un sistema di gestione ISO e l'amministrazione del personale",
            "Checkpoint: uno per modulo, bloccante, cinque domande estratte da una banca di almeno dieci, soglia 80%",
            "Esame finale: venti domande estratte da una banca di trentadue, soglia 75% (15 su 20)",
            "Area di catalogo: manageriale · Modalità: FAD asincrona con relatore avatar su ogni slide",
            "Prezzo: 300 € (prezzo di listino 549 €), IVA esclusa",
        ],
        "piede": "Parità di genere UNI/PdR 125:2022 — Evalis Academy",
        "file": "Evalis_Academy_Parita_di_genere_PdR125_Approvazione.docx",
    },
    "fadpas24000": {
        # parti della PAS 24000:2022 (programma delle dieci unità del committente)
        "copertura": {
            1: "premessa, clausole 1 e 2",
            2: "clausole 0, 3 e 4",
            3: "clausola 5",
            4: "clausola 6, Annex A.1",
            5: "clausola 7",
            6: "Annex A.2, A.3, A.4, A.5",
            7: "Annex A.6, A.7, punto 8.2",
            8: "Annex A.8, A.9, A.10, A.11",
            9: "punti 8.1 e 9.1",
            10: "punti 9.2, 9.3, clausola 10",
        },
        "tipo_documento": "specifica",  # una PAS non è una norma
        "titolo_corso": "PAS 24000:2022 — SISTEMA DI GESTIONE SOCIALE: DAI REQUISITI ALLA CERTIFICAZIONE",
        "titolo_doc": "PROPOSTA DIDATTICA — CORSO PAS 24000:2022 SISTEMA DI GESTIONE SOCIALE",
        "presentazione": "Il presente documento raccoglie la struttura didattica del corso FAD-PAS24000-01 sul sistema di "
            "gestione sociale secondo la specifica PAS 24000:2022. Il corso nasce dal materiale didattico già redatto (dieci "
            "unità, centoventi sezioni, il caso ricorrente di Agroconserve Matesina) ed è verificato sul testo ufficiale della "
            "specifica pubblicata da BSI, in vigore dal 30 settembre 2022. Ogni unità diventa un modulo della piattaforma con la "
            "stessa durata del programma, e ogni slide è narrata dal relatore avatar, con lo stesso standard di voce, "
            "impaginazione e verifica dei corsi già in catalogo.",
        "titolo_sintesi": "PAS 24000:2022 — Sistema di gestione sociale: dai requisiti alla certificazione",
        "ore": 24,
        "verifiche": "Ogni modulo è una lezione della piattaforma e si chiude con un checkpoint di verifica (quiz con domande "
            "estratte da banca dati, non conteggiato nel monte ore), costruito sulle verifiche intermedie dell'unità. Il corso "
            "si chiude con l'esame finale: 20 domande estratte dalla banca delle 120 domande degli esami di unità, soglia del 75%.",
        "obiettivi": [
            "Spiegare che cos'è la responsabilità sociale d'impresa e collocare la PAS 24000 tra convenzioni ILO, Principi guida ONU, norme europee e italiane",
            "Distinguere la PAS 24000 da SA8000, ISO 26000, ISO 45001, UNI/PdR 125 e dai protocolli di audit di filiera; conoscere accreditamento e schema FSSC 24000",
            "Leggere struttura, principi e termini della specifica; analizzare contesto, parti interessate, requisiti legali e campo di applicazione",
            "Definire impegni della direzione, politica sociale, ruoli e partecipazione dei lavoratori",
            "Condurre la valutazione dei rischi sociali e la due diligence sui diritti umani e fissare obiettivi misurabili",
            "Attuare i requisiti minimi dell'Annex A: lavoro forzato e minorile, libertà di associazione, trattamento equo, salute e sicurezza, edifici, rapporti di lavoro, orario, reclami, etica",
            "Gestire attività operative, approvvigionamento sociale lungo la filiera e indicatori di prestazione",
            "Preparare audit interno, riesame, miglioramento e certificazione, applicando tutto al caso Agroconserve Matesina",
        ],
        "dettagli": [
            "Destinatari: consulenti di sistemi di gestione, responsabili HR e del personale, responsabili sostenibilità ed ESG, auditor interni, responsabili acquisti e qualità. Si dà per nota la struttura di un sistema di gestione ISO",
            "Checkpoint: uno per modulo, bloccante, cinque domande estratte da una banca di almeno dieci, soglia 80%",
            "Esame finale: venti domande estratte dalla banca delle centoventi domande degli esami di unità, soglia 75%",
            "Area di catalogo: manageriale · Modalità: FAD asincrona con relatore avatar su ogni slide",
            "Prezzo: 300 € (prezzo di listino 549 €), IVA esclusa",
        ],
        "piede": "PAS 24000:2022 Sistema di gestione sociale — Evalis Academy",
        "file": "Evalis_Academy_PAS24000_Sistema_gestione_sociale_Approvazione.docx",
    },
    "fadcfp01": {
        # standard di riferimento di ogni unità (programma delle dieci unità del committente)
        "copertura": {
            1: "quadro generale: GHG Protocol, ISO 14064, 14067, 14068-1",
            2: "formula del conteggio, fattori, GWP IPCC AR6",
            3: "ISO 14064-1 (confini, sei categorie), GHG Protocol",
            4: "Scope 1 · categoria 1 ISO 14064-1",
            5: "Scope 2 · GHG Protocol Scope 2 Guidance",
            6: "Scope 3 · GHG Protocol, 15 categorie",
            7: "rapporto GHG, incertezza, ISO 14064-3",
            8: "ISO 14067",
            9: "obiettivi e piano di riduzione",
            10: "ISO 14068-1, dichiarazioni, esercitazione",
        },
        "tipo_documento": "norma",
        "titolo_corso": "CARBON FOOTPRINT — MISURARE, CALCOLARE E RIDURRE LE EMISSIONI DI ORGANIZZAZIONI E PRODOTTI",
        "titolo_doc": "PROPOSTA DIDATTICA — CORSO CARBON FOOTPRINT DI ORGANIZZAZIONE E DI PRODOTTO",
        "presentazione": "Il presente documento raccoglie la struttura didattica del corso FAD-CFP-01 sulla carbon footprint "
            "di organizzazione e di prodotto. Il corso nasce dal materiale didattico già redatto (dieci unità, centoventi "
            "sezioni, il caso ricorrente del Pastificio Terrafelix) e segue GHG Protocol, ISO 14064-1, ISO 14067 e ISO 14068-1. "
            "Tutti i centotrenta calcoli svolti del materiale sono stati ricalcolati riga per riga e coincidono con i totali "
            "dichiarati. Ogni unità diventa un modulo della piattaforma con la stessa durata del programma, e ogni slide è "
            "narrata dal relatore avatar, con lo stesso standard di voce, impaginazione e verifica dei corsi già in catalogo. "
            "I calcolatori «Prova tu» restano interattivi anche in piattaforma.",
        "titolo_sintesi": "Carbon Footprint — misurare, calcolare e ridurre le emissioni di organizzazioni e prodotti",
        "ore": 24,
        "verifiche": "Ogni modulo è una lezione della piattaforma e si chiude con un checkpoint di verifica (quiz con domande "
            "estratte da banca dati, non conteggiato nel monte ore), costruito sulle verifiche intermedie dell'unità. Il corso "
            "si chiude con l'esame finale: 20 domande estratte dalla banca delle 120 domande degli esami di unità, soglia del 75%.",
        "obiettivi": [
            "Spiegare effetto serra, gas serra e CO2 equivalente, e convertire una quantità di gas con il GWP a 100 anni",
            "Applicare la formula dato di attività per fattore di emissione, scegliendo unità di misura, fattori e fonti corrette",
            "Impostare l'inventario di un'organizzazione: confini, Scope 1, 2 e 3, le sei categorie della ISO 14064-1, anno base",
            "Calcolare le emissioni dirette: combustione fissa e mobile, gas refrigeranti, emissioni di processo",
            "Calcolare le emissioni da energia acquistata con i metodi location-based e market-based",
            "Calcolare le emissioni della catena del valore, scegliendo metodo e priorità fra le 15 categorie",
            "Consolidare l'inventario, valutare l'incertezza, preparare il rapporto GHG e la verifica",
            "Calcolare la carbon footprint di un prodotto secondo la ISO 14067: unità funzionale, confine, allocazione",
            "Fissare obiettivi di riduzione e costruire un piano di decarbonizzazione con costi e priorità",
            "Usare correttamente crediti, neutralità carbonica e comunicazione, applicando tutto al caso Terrafelix",
        ],
        "dettagli": [
            "Destinatari: responsabili ambiente, energia e sostenibilità, consulenti di sistemi di gestione, responsabili qualità, amministrazione e acquisti che forniscono i dati, auditor interni. Nessun prerequisito: si parte da zero",
            "Checkpoint: uno per modulo, bloccante, cinque domande estratte da una banca di almeno dieci, soglia 80%",
            "Esame finale: venti domande estratte dalla banca delle centoventi domande degli esami di unità, soglia 75%",
            "Area di catalogo: manageriale · Modalità: FAD asincrona con relatore avatar su ogni slide, calcolatori interattivi",
            "Prezzo: 300 € (prezzo di listino 549 €), IVA esclusa",
        ],
        "piede": "Carbon Footprint di organizzazione e di prodotto — Evalis Academy",
        "file": "Evalis_Academy_Carbon_Footprint_Approvazione.docx",
    },
    "fadpriv01": {
        # articoli del GDPR e del Codice privacy di ogni modulo
        "copertura": {
            1: "GDPR artt. 4, 5, 6, 9, 10, 13-14, 30",
            2: "GDPR artt. 15-22, 28, 29; art. 2-quaterdecies Codice",
            3: "GDPR art. 32 (misure comportamentali)",
            4: "GDPR artt. 4 n. 12, 33, 34",
            5: "casi pratici su tutto il corso",
        },
        "tipo_documento": "norma",
        "titolo_corso": "PRIVACY E PROTEZIONE DEI DATI PER IL PERSONALE (GDPR)",
        "titolo_doc": "PROPOSTA DIDATTICA — CORSO PRIVACY E PROTEZIONE DEI DATI PER IL PERSONALE",
        "presentazione": "Il presente documento raccoglie la struttura didattica del corso FAD-PRIV-01, la formazione "
            "obbligatoria del personale autorizzato al trattamento prevista dagli articoli 29 e 32 del Regolamento UE 2016/679 "
            "(GDPR) e dall'articolo 2-quaterdecies del D.Lgs. 196/2003. Il corso nasce dal materiale didattico già redatto "
            "(cinque moduli, il caso ricorrente di Officine Meridiana) e ne conserva ordine, regole ed esempi. Ogni slide è "
            "narrata dal relatore avatar, con lo stesso standard di voce, impaginazione e verifica dei corsi già in catalogo. "
            "Gli esercizi del materiale diventano esercizi guidati spiegati dal relatore e alimentano le verifiche bloccanti.",
        "titolo_sintesi": "Privacy e protezione dei dati per il personale",
        "ore": 3,
        "verifiche": "Ogni modulo è una lezione della piattaforma e si chiude con un checkpoint di verifica (quiz con domande "
            "estratte da banca dati, non conteggiato nel monte ore), costruito sulle verifiche del materiale didattico. Il corso "
            "si chiude con l'esame finale: 12 domande estratte dalla banca, soglia del 75% (9 su 12), e con l'attestato di "
            "formazione EVALIS Academy.",
        "obiettivi": [
            "Riconoscere un dato personale e distinguere dati comuni, categorie particolari e dati giudiziari",
            "Collocare i ruoli: titolare, responsabile, autorizzato, DPO e referente privacy, interessato",
            "Applicare i principi del GDPR nel lavoro quotidiano: finalità, minimizzazione, conservazione",
            "Gestire in sicurezza password, posta elettronica, dispositivi e lavoro da remoto; riconoscere il phishing",
            "Riconoscere un data breach e segnalarlo subito, nel rispetto delle 72 ore",
            "Riconoscere una richiesta di esercizio dei diritti e inoltrarla nei tempi giusti",
        ],
        "dettagli": [
            "Destinatari: tutto il personale autorizzato al trattamento. Corso obbligatorio per le aziende (artt. 29 e 32 GDPR)",
            "Checkpoint: uno per modulo, bloccante, cinque domande estratte da una banca di almeno dieci, soglia 80%",
            "Esame finale: dodici domande estratte dalla banca, soglia 75% (9 su 12)",
            "Attestato: attestato di formazione EVALIS Academy (nessun accreditamento CERTIS)",
            "Area di catalogo: privacy e compliance · Modalità: FAD asincrona con relatore avatar su ogni slide",
            "Prezzo: 50 € a persona; 30 € a persona nei pacchetti aziendali con più dipendenti, IVA esclusa",
        ],
        "piede": "Privacy e protezione dei dati per il personale — Evalis Academy",
        "file": "Evalis_Academy_Privacy_Personale_FAD-PRIV-01_Approvazione.docx",
    },
    "fadpriv02": {
        "copertura": {
            1: "GDPR artt. 5, 28, 29, 33; ripasso",
            2: "GDPR art. 32 (minacce attuali, IA generativa)",
            3: "Reg. UE 2024/1689, D.Lgs. 138/2024, Garante",
            4: "casi pratici; GDPR artt. 15-17, 33",
        },
        "tipo_documento": "norma",
        "titolo_corso": "AGGIORNAMENTO ANNUALE PRIVACY PER IL PERSONALE (GDPR)",
        "titolo_doc": "PROPOSTA DIDATTICA — AGGIORNAMENTO ANNUALE PRIVACY PER IL PERSONALE",
        "presentazione": "Il presente documento raccoglie la struttura didattica del corso FAD-PRIV-02, l'aggiornamento annuale "
            "obbligatorio della formazione del personale autorizzato al trattamento (artt. 29 e 32 GDPR; art. 2-quaterdecies "
            "D.Lgs. 196/2003), rivolto a chi ha completato il corso base FAD-PRIV-01 o una formazione equivalente. Il corso nasce "
            "dal materiale didattico già redatto e ne conserva ordine, regole ed esempi. Ogni slide è narrata dal relatore "
            "avatar, con lo stesso standard dei corsi già in catalogo.",
        "titolo_sintesi": "Aggiornamento annuale privacy per il personale",
        "ore": 1,
        "verifiche": "Ogni modulo è una lezione della piattaforma e si chiude con un checkpoint di verifica (quiz con domande "
            "estratte da banca dati, non conteggiato nel monte ore). Il corso si chiude con l'esame finale: 8 domande estratte "
            "dalla banca, soglia del 75% (6 su 8), e con l'attestato di formazione EVALIS Academy.",
        "obiettivi": [
            "Ripassare principi, ruoli, diritti e segnalazione delle violazioni",
            "Riconoscere le minacce attuali: phishing mirato, quishing, deepfake vocali, MFA fatigue, pagine clonate",
            "Usare l'intelligenza artificiale generativa senza esporre dati personali",
            "Conoscere le novità: Regolamento IA, NIS2, provvedimenti del Garante, istruzioni interne aggiornate",
            "Applicare le regole ai casi dell'anno",
        ],
        "dettagli": [
            "Destinatari: personale che ha già completato FAD-PRIV-01 o una formazione equivalente. Aggiornamento obbligatorio annuale",
            "Checkpoint: uno per modulo, bloccante, cinque domande estratte da una banca di almeno dieci, soglia 80%",
            "Esame finale: otto domande estratte dalla banca, soglia 75% (6 su 8)",
            "Attestato: attestato di formazione EVALIS Academy (nessun accreditamento CERTIS)",
            "Area di catalogo: privacy e compliance · Modalità: FAD asincrona con relatore avatar su ogni slide",
            "Prezzo: 25 € a persona; 20 € a persona nei pacchetti aziendali con più dipendenti, IVA esclusa",
        ],
        "piede": "Aggiornamento annuale privacy — Evalis Academy",
        "file": "Evalis_Academy_Aggiornamento_Privacy_FAD-PRIV-02_Approvazione.docx",
    },
    "fadpriv03": {
        "copertura": {
            1: "GDPR artt. 5, 24, 30, 35, 37-39; art. 2-quaterdecies",
            2: "GDPR artt. 28, 29, 44-49, 15-22",
            3: "L. 300/1970 art. 4; Garante; D.Lgs. 24/2023",
            4: "Provvedimento Garante 27/11/2008",
            5: "GDPR art. 32; NIS2; ISO/IEC 27001",
            6: "GDPR artt. 33, 34; EDPB 9/2022",
            7: "Reg. UE 2024/1689; GDPR art. 28 e 44",
            8: "GDPR artt. 58, 83; Codice artt. 166-171",
        },
        "tipo_documento": "norma",
        "titolo_corso": "PRIVACY PER MANAGER E AMMINISTRATORI DI SISTEMA",
        "titolo_doc": "PROPOSTA DIDATTICA — CORSO PRIVACY PER MANAGER E AMMINISTRATORI DI SISTEMA",
        "presentazione": "Il presente documento raccoglie la struttura didattica del corso FAD-PRIV-03 per chi decide, organizza "
            "o amministra trattamenti di dati personali: responsabili di funzione, dirigenti, referenti privacy interni e "
            "amministratori di sistema. Il corso nasce dal materiale didattico già redatto (otto moduli) e ne conserva ordine, "
            "regole ed esempi; integra la formazione base FAD-PRIV-01. Ogni slide è narrata dal relatore avatar, con lo stesso "
            "standard di voce, impaginazione e verifica dei corsi già in catalogo. Esercizi ed esercitazioni del materiale "
            "diventano esercizi guidati spiegati dal relatore e alimentano le verifiche bloccanti.",
        "titolo_sintesi": "Privacy per manager e amministratori di sistema",
        "ore": 8,
        "verifiche": "Ogni modulo è una lezione della piattaforma e si chiude con un checkpoint di verifica (quiz con domande "
            "estratte da banca dati, non conteggiato nel monte ore), costruito sulle verifiche del materiale didattico. Il corso "
            "si chiude con l'esame finale: 20 domande estratte dalla banca, soglia del 75% (15 su 20), e con l'attestato di "
            "formazione EVALIS Academy.",
        "obiettivi": [
            "Governare il sistema privacy della propria area: accountability, registro, DPIA, informative, designazioni",
            "Autorizzare per ruolo, istruire e vigilare; scegliere e contrattualizzare i fornitori; gestire i trasferimenti extra-UE",
            "Impostare controlli sui lavoratori leciti: art. 4 dello Statuto, videosorveglianza, metadati, whistleblowing",
            "Applicare il Provvedimento del Garante sugli amministratori di sistema: designazione, log, verifica annuale",
            "Scegliere e verificare le misure dell'art. 32, in raccordo con NIS2 e ISO/IEC 27001",
            "Gestire un data breach: contenimento, valutazione del rischio, notifica e comunicazione",
            "Introdurre IA e servizi cloud nel rispetto di GDPR e Regolamento IA",
            "Affrontare ispezioni, conoscere sanzioni e responsabilità, condurre l'audit interno annuale",
        ],
        "dettagli": [
            "Destinatari: responsabili di funzione, dirigenti, referenti privacy interni e amministratori di sistema",
            "Checkpoint: uno per modulo, bloccante, cinque domande estratte da una banca di almeno dieci, soglia 80%",
            "Esame finale: venti domande estratte dalla banca, soglia 75% (15 su 20)",
            "Attestato: attestato di formazione EVALIS Academy (nessun accreditamento CERTIS)",
            "Area di catalogo: privacy e compliance · Modalità: FAD asincrona con relatore avatar su ogni slide",
            "Prezzo: 250 €, IVA esclusa",
        ],
        "piede": "Privacy per manager e amministratori di sistema — Evalis Academy",
        "file": "Evalis_Academy_Privacy_Manager_ADS_FAD-PRIV-03_Approvazione.docx",
    },
    "fadpia01": {
        # norme di ogni modulo; le esercitazioni rimandano al modulo di teoria del materiale
        "copertura": {
            1: "L. 4/2013; ISO/IEC 17024; UNI 11493-1; norme di prodotto",
            2: "UNI EN 14411; ISO 10545-4 e -12; DIN 51130, 51097",
            3: "UNI 11493-1 (supporti); UNI EN 13813, 13318",
            4: "UNI EN 12004; UNI EN 13888",
            5: "UNI 11493-1 (posa, fughe, giunti)",
            6: "D.Lgs. 81/2008; UNI 11493-1 (manutenzione)",
            7: "esercitazione 1, rimando al modulo 3",
            8: "esercitazione 2, rimando al modulo 4",
            9: "esercitazione 3, rimando al modulo 4",
            10: "esercitazione 4, rimando al modulo 5",
            11: "esercitazione 5, rimando al modulo 5",
            12: "esercitazione 6, rimando al modulo 2",
            13: "esercitazione 7, rimando al modulo 5",
            14: "esercitazione 8, rimando al modulo 6",
        },
        "tipo_documento": "norma",
        "titolo_corso": "PIASTRELLISTA — POSATORE DI PAVIMENTI E RIVESTIMENTI CERAMICI (UNI 11493-1)",
        "titolo_doc": "PROPOSTA DIDATTICA — CORSO PIASTRELLISTA, POSATORE DI PAVIMENTI E RIVESTIMENTI CERAMICI",
        "presentazione": "Il presente documento raccoglie la struttura didattica del corso FAD-PIA-01 per piastrellisti e posatori "
            "di pavimenti e rivestimenti ceramici, propedeutico alla certificazione delle competenze secondo la ISO/IEC 17024 "
            "(schema CERTIS). Il corso nasce dal materiale didattico già redatto (sei moduli di teoria per 16 ore, otto "
            "esercitazioni pratiche per 24 ore) e ne conserva ordine, regole, esempi e soluzioni. Ogni slide è narrata dal "
            "relatore avatar, con lo stesso standard di voce, impaginazione e verifica dei corsi già in catalogo. Ogni "
            "esercitazione diventa un modulo di casi di cantiere guidati dal relatore, con calcoli svolti e simulatori, e si "
            "chiude con una verifica bloccante costruita sulle voci dell'esercitazione: chi sbaglia non avanza e ripassa il modulo.",
        "titolo_sintesi": "Piastrellista, posatore di pavimenti e rivestimenti ceramici (UNI 11493-1)",
        "ore": 40,
        "verifiche": "Ogni modulo è una lezione della piattaforma e si chiude con un checkpoint di verifica (quiz con domande "
            "estratte da banca dati, non conteggiato nel monte ore), costruito sulle verifiche e sulle esercitazioni del "
            "materiale didattico. Il corso si chiude con l'esame finale: 12 domande estratte da una banca di circa 30, soglia "
            "del 75% (9 su 12), costruito sulle domande del materiale didattico.",
        "obiettivi": [
            "Collocare la professione: Legge 4/2013, UNI 11493-1, norme di prodotto, certificazione ISO/IEC 17024",
            "Scegliere piastrelle, adesivi e sigillanti in funzione di supporto, destinazione d'uso e formato",
            "Verificare l'idoneità del supporto (umidità, planarità, stagionatura) e verbalizzare le non idoneità",
            "Calcolare i consumi di adesivo e fugante e ordinare i materiali",
            "Progettare fughe e giunti di dilatazione, in interno e in esterno",
            "Eseguire la posa nella sequenza corretta e lavorare in sicurezza, compresa la protezione dalla silice",
            "Diagnosticare i difetti più frequenti e scegliere l'intervento corretto; consegnare l'opera con le istruzioni di manutenzione",
        ],
        "dettagli": [
            "Destinatari: piastrellisti e posatori che preparano la certificazione delle competenze, imprese di posa. Livello EQF 3",
            "Checkpoint: uno per modulo, bloccante, cinque domande estratte da una banca di almeno dieci, soglia 80%",
            "Esame finale: dodici domande estratte dalla banca, soglia 75% (9 su 12)",
            "Certificato: a fine corso l'attestato provvisorio; la certificazione delle competenze ISO/IEC 17024 si consegue con l'esame CERTIS",
            "Area di catalogo: mestieri e professioni · Modalità: FAD asincrona con relatore avatar su ogni slide, calcoli svolti e simulatori",
        ],
        "piede": "Piastrellista, posatore di pavimenti e rivestimenti ceramici — Evalis Academy",
        "file": "Evalis_Academy_Piastrellista_FAD-PIA-01_Approvazione.docx",
    },
}
if corso not in CORSI:
    sys.exit(f"{corso}: testi del corso mancanti in CORSI (copertura, presentazione, obiettivi...)")
C = CORSI[corso]
COPERTURA = C["copertura"]

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
    for x in trs[0].iter(qn("w:t")):  # intestazione: il modello dice "norma"
        if x.text and "norma" in x.text:
            x.text = x.text.replace("norma", C["tipo_documento"])
    for valori in righe:
        tr = copy.deepcopy(modello_riga)
        for c, v in zip(tr.findall(qn("w:tc")), valori):
            cella(c, v)
        t.append(tr)
    sect.addprevious(t)


titolo_corso = C["titolo_corso"]
par("titolo", C["titolo_doc"])
par("sottotitolo", "EVALIS ACADEMY")
par("emesso", "EMESSO A OTTOBRE 2026 — BOZZA PER APPROVAZIONE")
par("vuoto", "")
par("testo", C["presentazione"])
par("vuoto", "")
par("intestazione", "Il corso in sintesi")
tabella("tab_sintesi", [[C["titolo_sintesi"], f"{C['ore']} ore", str(len(moduli)), str(TOT_SLIDE)]])
par("corsivo", f"Totale: {C['ore']} ore di formazione ({TOT_MIN} minuti di contenuti narrati per {C['ore'] * 60} minuti legali) · {TOT_SLIDE} slide.")
par("testo", C["verifiche"])
par("vuoto", "")
par("intestazione", "Che cosa porta a casa chi frequenta il corso")
for punto in C["obiettivi"]:
    par("punto", punto)
par("vuoto", "")
par("corso", titolo_corso)
par("durata", f"Durata: {C['ore']} ore")
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
for punto in C["dettagli"]:
    par("punto", punto)

for s in doc.sections:
    for p in s.footer.paragraphs:
        if p.runs:
            p.runs[0].text = C["piede"]
            for r in p.runs[1:]:
                r.text = ""

out = REPO / "docs/produzione-corsi" / C["file"]
doc.save(str(out))
print(f"scritto {out.relative_to(REPO)} — {len(moduli)} moduli, {TOT_MIN} min, {TOT_SLIDE} slide")
