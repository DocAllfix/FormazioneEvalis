# Prompt per claude design — template slide corsi (FASE 5a)

> Decisione utente 2026-07-13: prompt MINIMALE, niente sovra-specifiche. Il logo Evalis
> Academy lo allega l'utente. Prima si fanno approvare i 2 template, POI si fanno
> generare le slide vere dei corsi partendo dai copioni.

## Prompt da incollare (template)

---

Devo creare le slide per dei corsi video professionali di formazione e certificazione
auditor ISO (ISO 9001, 14001, 45001, 19011 e simili), in italiano. Ogni slide accompagna
la narrazione di un relatore video che appare in una piccola bolla a sinistra della slide:
la slide è il supporto visivo di ciò che il relatore spiega.

Crea DUE template di slide tra cui sceglierò:
1. uno su palette calda ambra (arancione #EA580C su fondi crema)
2. uno su palette Evalis navy (blu notte #284261 con accenti)

Per ogni template mostrami una slide di contenuto tipo (titolo, alcuni punti chiave,
eventuale elemento come tabella o schema semplice). Ti allego il logo Evalis Academy
da integrare.

Vincoli tecnici (servono al player, non sono scelte di stile):
- ogni slide è un file HTML autonomo con radice `<section>` larga 1280px, alta almeno 720px
  (può crescere se il contenuto lo richiede), tutto il CSS inline o in un tag `<style>` interno;
- lo sfondo della `<section>` dichiarato inline come colore esadecimale (es. `background:#F7F3EC`);
- font disponibili: IBM Plex Sans, IBM Plex Mono, Space Grotesk (già caricati dal player);
- nessuna immagine esterna: solo HTML/CSS/SVG inline.

---

## Dopo l'approvazione dei 2 template (FASE 5b)

Per ogni corso si consegna a claude design il contenuto per slide (titolo + speakerNotes +
testo narrato) con la richiesta: "genera le slide del corso usando il template approvato,
un file HTML per slide, nominato con l'ID che ti fornisco (es. 19011_m01_s001.html);
la slide deve essere coerente e fedele a ciò che il relatore narra in quella slide".
Fan-out per corso. Al rientro: gates automatici (FASE 5c) — completezza ID, anti-overflow
via screenshot, coerenza termini col copione, contact sheet per corso.

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
