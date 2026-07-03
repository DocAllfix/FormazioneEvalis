# Catalogo corsi Auditor — skeleton completi per valutazione cliente

> Documento di sintesi (2026-07-03). Gli skeleton dettagliati (moduli + argomenti per slide)
> sono in `produzione/<corso>/struttura.md`. Ogni skeleton nasce dall'analisi del testo
> ufficiale della norma (`testonorme/`) ed è già dimensionato con le metriche di produzione
> REALI misurate sul pilota (voce 2,35 parole/s, slide ≈ 4,5 min): ciò che il cliente approva
> qui è esattamente ciò che verrà prodotto, senza traduzioni intermedie.

## Il catalogo in una tabella

| Corso | Norma | Durata | Moduli | Slide | Stato |
|---|---|---|---|---|---|
| Auditor di sistemi di gestione (propedeutico) | ISO 19011 | **16h** (960 min legali, 985 di contenuti) | 9 | 221 | M1-M2 già scritti, M1 già in AUDIO |
| Auditor/Lead Auditor Qualità | ISO 9001 | 24h (1.440 legali, 1.480 contenuti) | 12 | 331 | skeleton |
| Auditor/Lead Auditor Ambiente | ISO 14001 | 24h | 12 | 331 | skeleton |
| Auditor/Lead Auditor Sicurezza sul lavoro | ISO 45001 | 24h | 12 | 331 | skeleton |
| Auditor/Lead Auditor Sicurezza informazioni | ISO/IEC 27001 | 24h | 12 | 331 | skeleton |
| Auditor/Lead Auditor Sicurezza alimentare | ISO 22000 | 24h | 12 | 331 | skeleton |
| Auditor/Lead Auditor Energia | ISO 50001 | 24h | 12 | 331 | skeleton |
| Auditor/Lead Auditor Anticorruzione | ISO 37001 | 24h | 12 | 331 | skeleton |
| Auditor/Lead Auditor Sicurezza stradale | ISO 39001 | 24h | 12 | 331 | skeleton |
| Auditor/Lead Auditor Intelligenza artificiale | ISO/IEC 42001 | 24h | 12 | 331 | skeleton |

**Totale catalogo: 232 ore · ~3.200 slide · ~10 corsi.**

## L'architettura comune dei corsi 24h (12 moduli)

Tutti i corsi auditor condividono la stessa spina dorsale — è un vantaggio didattico (chi fa
più corsi ritrova la struttura) e produttivo (fabbrica ripetibile):

1. **M1 (100')** — Il percorso, la disciplina, lo schema di certificazione
2. **M2 (125')** — La norma: struttura, concetti, termini della disciplina
3. **M3-M5 (125' l'uno)** — I requisiti: contesto/leadership, pianificazione, supporto
4. **M6-M7 (125')** — Il cuore operativo SPECIFICO della norma (vedi sotto)
5. **M8-M9 (125')** — Valutazione delle prestazioni, miglioramento e NC tipiche
6. **M10-M11 (125')** — VERIFICARE il sistema: la ISO 19011 applicata alla disciplina
   (programma, preparazione, conduzione sul campo, risultanze tipiche)
7. **M12 (130')** — Due casi completi + simulazione d'esame + certificazione

Checkpoint quiz bloccante a ogni modulo (fuori monte-ore) + esame finale con banca separata.

## Ciò che rende OGNI corso specifico (il cuore M6-M7 e i moduli "motore")

- **9001**: dal requisito del cliente alla progettazione (8.1-8.4) · produzione, rilascio, output non conformi (8.5-8.7)
- **14001**: modulo dedicato ad aspetti ambientali e obblighi di conformità (6.1) · controllo operativo col ciclo di vita · emergenze + conformità legale
- **45001**: partecipazione dei lavoratori (5.4, tratto distintivo) · gerarchia dei controlli, appaltatori · emergenze + indagine incidenti
- **27001**: modulo "motore del rischio" (assessment, treatment, Dichiarazione di Applicabilità) · DUE moduli sui 93 controlli dell'Appendice A (organizzativi · persone/fisico/tecnologici)
- **22000**: TRE moduli operativi — PRP/rintracciabilità/emergenze · HACCP (analisi pericoli, CCP/OPRP, validazione) · monitoraggio/verifica/NC di prodotto e ritiri
- **50001**: modulo "motore" su analisi energetica, EnPI, baseline, piano dati (6.3-6.6) · modulo dedicato alla PRESTAZIONE (normalizzazione, dimostrare il miglioramento coi numeri)
- **37001**: valutazione del rischio di corruzione (4.5) · funzione di conformità e governance · due diligence e controlli · regali/segnalazioni/indagini
- **39001**: modulo dedicato ai fattori di prestazione RTS (esposizione/esito finale/esito intermedio) · modulo dedicato all'indagine sugli incidenti stradali
- **42001**: modulo "capire l'IA quanto basta per verificarla" (unico nel catalogo) · doppio motore rischio+valutazione d'impatto (8.2-8.4) · controlli Appendice A con guida B

## Domande aperte per il cliente (da sciogliere PRIMA della scrittura)

1. **Durate confermate?** 19011 = 16h, tutti gli altri = 24h (così sono dimensionati gli skeleton).
2. **Ordine di produzione**: proposto 9001 → 45001 → 27001 → 14001 → 22000 → 37001 → 42001 → 50001 → 39001 (priorità commerciale). Conferma o modifica?
3. **Titolazione moduli**: i titoli sono definitivi o il cliente vuole rivederli (es. terminologia interna CERTIS)?
4. **M1 di ogni corso** cita lo schema di certificazione (esame, requisiti, mantenimento): servono i dettagli reali degli schemi CERTIS per scrivere quelle slide con precisione.
5. **Casi completi (M12)**: i settori scelti per i casi vanno bene o preferisce settori dove ha più clienti?

## Nota di produzione

Ogni riga di questi skeleton è già misurabile dai gate automatici: budget parole per modulo
(E6, a 2,35 p/s), copertura dei concetti (E7, dalla checklist per modulo), anti-verbatim
dalla norma (E5), pronunce e numeri (glossario per corso, E3). Approvato lo skeleton, la
scrittura dei copioni procede modulo per modulo con lint bloccante — identico al processo
già collaudato su ISO 19011 M1 (già in audio) e M2.
