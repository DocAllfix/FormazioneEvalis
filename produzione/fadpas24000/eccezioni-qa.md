# Eccezioni QA — fadpas24000 (PAS 24000:2022)

## Giudice indipendente delle risposte (qa-risposte-quiz.mjs), 13/10/2026

386 domande (266 di verifica + 120 d'esame), 12 disaccordi. Tutti verificati a mano sul testo
ufficiale (`testonorme/PAS24000-2022.txt`) e sul caso studio del committente: in tutti e 12 la
chiave del corso è CORRETTA e sbaglia il giudice. Nessuna chiave modificata.

| Dove | Domanda | Chiave | Perché la chiave è giusta |
|---|---|---|---|
| checkpoint m01 | Strumento che NON porta a certificazione | SMETA | Protocollo di audit di filiera: rapporto, non certificato. La UNI/PdR 125 è certificabile sotto accreditamento. |
| checkpoint m01 | L'Annex A è | normativo | Il testo intitola «Annex A (Normative)». |
| checkpoint m01 | Escludere un tema dell'Annex A | no, senza esclusioni | Clausola 1: requisiti «fulfilled without exclusion». |
| checkpoint m02 | «Minore» per la PAS | meno di 18 anni | Definizione 3.2: «human being below the age of 18 years». |
| checkpoint m02 | Tema meno coperto nel caso | A.1 diritti umani e due diligence | Dato della gap analysis del caso studio del committente. |
| checkpoint m08 | Soglia alta delle ore totali | 60 | A.9, requisiti 2 e 3: 60 h per settimana, straordinari compresi. |
| checkpoint m08 | Accesso al reclamo (A.10, req. 1) | lavoratori e soggetti esterni | «accessible to all workers and external parties». |
| checkpoint m10 | Causa radice dei due superamenti | rischio e allarme solo per gli stagionali | Analisi dei 5 perché del caso studio del committente (unità 10). |
| esame finale | La PAS tutela più della legge | si applica la PAS | Regola del livello più favorevole, nei due sensi (unità 1). |
| esame finale | «Direttamente collegata» | danno causato da un partner senza contributo | Principi guida ONU: causare / contribuire / essere direttamente collegati. |
| esame finale | Allontanamento per fuga di vapore | nessuna sanzione | Diritto di allontanarsi da un pericolo grave senza permesso e senza ritorsioni. |
| esame finale | Il salario dignitoso è | raccomandazione con piano | A.8: è una NOTA («should develop a plan»), non un requisito. |

## Domande del committente non sostenute dal solo modulo (_banche-committente.py)

5 domande segnalate perché il giudice vedeva solo la narrazione del modulo di appartenenza;
verificate a mano e tenute (SMETA m01, A.10 e 10.2 m02, punto 5.3 m05 coperto in m03, punto 8.2 f)
m07, multa disciplinare m08). Dettaglio nel rapporto `_staging/slide-gates/fadpas24000/banche-committente.json`.
