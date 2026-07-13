# Prompt per claude design — template slide corsi (FASE 5a)

> Un prompt per template, autonomo: si lancia il primo, poi il secondo (o in due sessioni
> parallele). Il logo Evalis Academy lo allega l'utente a ciascun prompt. Prima si fanno
> approvare i template completi, POI si fanno generare le slide vere dei corsi dai copioni.

---

## PROMPT 1 — Template AMBRA

Devo creare le slide per dei corsi video professionali di formazione e certificazione
auditor ISO (ISO 9001, 14001, 45001, 19011 e simili), in italiano. Ogni slide accompagna
la narrazione di un relatore video che appare in una piccola bolla a sinistra della slide:
la slide è il supporto visivo di ciò che il relatore spiega, non deve essere affollata.

Crea un template completo su palette calda ambra (arancione #EA580C su fondi crema),
con il logo Evalis Academy che ti allego integrato con discrezione. Il template deve
coprire questi tipi di slide, uno d'esempio per ciascuno:

1. Apertura del corso (titolo del corso, benvenuto)
2. Chiusura del corso (congratulazioni, prossimi passi)
3. Apertura di modulo (numero e titolo del modulo, cosa si imparerà)
4. Chiusura di modulo (riepilogo dei punti chiave del modulo)
5. Slide di contenuto con titolo e punti chiave (il tipo più usato)
6. Slide di contenuto con tabella semplice
7. Slide di contenuto con schema o diagramma semplice (solo HTML/CSS/SVG)
8. Slide di definizione (un termine importante messo in evidenza, con spiegazione)
9. Schermata quiz di fine modulo (domanda con quattro opzioni di risposta)
10. Schermata esame finale (stesso stile del quiz ma con intestazione da esame)

Vincoli tecnici (servono al player, non sono scelte di stile):
- ogni slide è un file HTML autonomo con radice `<section>` larga 1280px, alta almeno 720px
  (può crescere se il contenuto lo richiede), tutto il CSS inline o in un tag `<style>` interno;
- lo sfondo della `<section>` dichiarato inline come colore esadecimale (es. `background:#F7F3EC`);
- font disponibili: IBM Plex Sans, IBM Plex Mono, Space Grotesk (già caricati dal player);
- nessuna immagine esterna: solo HTML/CSS/SVG inline (il logo che ti allego può essere
  incorporato come SVG inline).

---

## PROMPT 2 — Template EVALIS NAVY

Devo creare le slide per dei corsi video professionali di formazione e certificazione
auditor ISO (ISO 9001, 14001, 45001, 19011 e simili), in italiano. Ogni slide accompagna
la narrazione di un relatore video che appare in una piccola bolla a sinistra della slide:
la slide è il supporto visivo di ciò che il relatore spiega, non deve essere affollata.

Crea un template completo su palette Evalis navy (blu notte #284261 con un accento a tua
scelta), con il logo Evalis Academy che ti allego integrato con discrezione. Il template
deve coprire questi tipi di slide, uno d'esempio per ciascuno:

1. Apertura del corso (titolo del corso, benvenuto)
2. Chiusura del corso (congratulazioni, prossimi passi)
3. Apertura di modulo (numero e titolo del modulo, cosa si imparerà)
4. Chiusura di modulo (riepilogo dei punti chiave del modulo)
5. Slide di contenuto con titolo e punti chiave (il tipo più usato)
6. Slide di contenuto con tabella semplice
7. Slide di contenuto con schema o diagramma semplice (solo HTML/CSS/SVG)
8. Slide di definizione (un termine importante messo in evidenza, con spiegazione)
9. Schermata quiz di fine modulo (domanda con quattro opzioni di risposta)
10. Schermata esame finale (stesso stile del quiz ma con intestazione da esame)

Vincoli tecnici (servono al player, non sono scelte di stile):
- ogni slide è un file HTML autonomo con radice `<section>` larga 1280px, alta almeno 720px
  (può crescere se il contenuto lo richiede), tutto il CSS inline o in un tag `<style>` interno;
- lo sfondo della `<section>` dichiarato inline come colore esadecimale (es. `background:#284261`);
- font disponibili: IBM Plex Sans, IBM Plex Mono, Space Grotesk (già caricati dal player);
- nessuna immagine esterna: solo HTML/CSS/SVG inline (il logo che ti allego può essere
  incorporato come SVG inline).

---

## PROMPT DI CORREZIONE (dopo la prima consegna del 2026-07-13 — ALLEGARE slide4-check.jpeg
## e/o demo-adaptive.jpeg: entrambi mostrano l'obiettivo finale)

Ti allego uno screenshot di come apparirà il risultato finale dentro il player dei corsi:
guarda bene. Il riquadro con il video del relatore in alto a sinistra
e la colonna su cui poggia NON fanno parte della slide: li aggiunge il player automaticamente,
a sinistra della slide, usando lo stesso colore di sfondo della slide. La slide che disegni
tu è SOLO la parte di contenuto che nello screenshot sta a destra del video.

Correggi quindi il template, su TUTTE le slide:
1. RIMUOVI completamente la colonna sinistra del relatore che hai disegnato (cerchio
   segnaposto, scritta RELATORE e tutto lo spazio dedicato): il contenuto deve occupare
   l'intera larghezza dei 1280px. Sposta il logo Evalis Academy dove sta meglio nel contenuto.
2. Togli tutte le animazioni CSS: le slide devono essere completamente statiche.
3. Su ogni `<section>` sostituisci `height:720px; overflow:hidden` con `min-height:720px`
   e senza overflow nascosto: se un contenuto è troppo lungo deve VEDERSI che sborda,
   non essere tagliato in silenzio.

Tutto il resto (stile, palette, tipografia, i dieci tipi di slide) va bene così.

## Nota sui tipi 9-10 (quiz ed esame)

I quiz e l'esame in piattaforma sono renderizzati dal motore quiz (domande estratte
casualmente dal DB, mai HTML statico): le schermate 9-10 del kit servono come RIFERIMENTO
VISIVO per riskinnare la UI quiz del player nello stesso stile del template scelto,
e come slide-annuncio prima del checkpoint dove servisse. Non diventano slide dei copioni.

## Dopo l'approvazione dei template (FASE 5b)

Per ogni corso si consegna a claude design il contenuto per slide (titolo + speakerNotes +
testo narrato) con la richiesta: "genera le slide del corso usando il template approvato,
scegliendo per ogni slide il tipo più adatto (apertura/chiusura modulo per le slide di
bentornato e riepilogo, contenuto/tabella/schema/definizione per le altre); un file HTML
per slide, nominato con l'ID che ti fornisco (es. 19011_m01_s001.html); la slide deve
essere coerente e fedele a ciò che il relatore narra in quella slide". Fan-out per corso.
Al rientro: gates automatici (FASE 5c) — completezza ID, anti-overflow via screenshot,
coerenza termini col copione, contact sheet per corso.

## Geometria player (fatti verificati, per i gate — NON vanno nel prompt)

- Canvas iframe: 1660px totali = gutter avatar 380px (sinistra) + slide 1280px
  (`src/components/player/slide-html.tsx`: SLIDE_W 1280, BASE_H 720, GUTTER 380).
- La slide NON deve riservare spazio alla bolla: il gutter è FUORI dalla `<section>`.
- Il gutter si tinge del colore di sfondo della slide (regex sul primo
  `background:#hex` della section → per questo lo sfondo deve essere hex inline).
- Bolla avatar: `left 1.5% / top 4.5% / width 20%` del totale, oggi con box 16:9
  (`aspect-video` in slide-step.tsx:113) → se il crop del base sarà quadrato
  (candidato: crop=1080:1080:420:0) si cambia quella sola classe in `aspect-square`.
- Altezza adattiva: se il contenuto supera 720px la canvas cresce e il player scala
  (fit-to-screen) — niente contenuto tagliato, ma slide più alte = testo più piccolo
  a schermo → il gate anti-overflow (FASE 5c) segnala le slide oltre ~900px di altezza.
