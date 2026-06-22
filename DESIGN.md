# DESIGN.md — Evalis (product register)

Coerente con la landing (stessa famiglia calda "Ambra"), declinato per il **prodotto**: più sobrio, denso dove serve, accento funzionale. I token vivono in `src/app/globals.css` (`@theme`, Tailwind v4).

## Palette (famiglia calda Ambra — niente #000/#fff)
- **Accento primario:** arancione `#EA5A0C` — azioni primarie, stato attivo, riempimento progressi. Strategia **Restrained**: copertura ≤10%.
- **Superfici:** app su **near-white caldo** (più pulito della crema landing), card bianche, bande crema (`#FAF8F5`/`#F5EFE6`).
- **Testo:** near-black caldo `#1C1206`; secondario grigio caldo `#766E66` (≥4.5:1 su chiaro). Bordi `#E7E2DA`/`#EAE4DB`.
- **Stati:** verde `#15803D` (valido/completato), ambra `#D97706` (scadenza/attenzione), rosso `#DC2626` (errore/non superato). Neutrali sempre tinti caldo.

## Tipografia
- **UI: DM Sans** (400/500/600/700); **numeri tabellari** nelle tabelle/KPI.
- **DM Serif Display** solo per pochi titoli grandi, empty-state, certificato.
- Scala con contrasto ≥1.25 tra livelli; body 14–16px, line-height ~1.5; max 65–75ch.

## Spaziatura & layout
- Scala 8pt. **Discente arioso**; **admin denso** (righe tabella compatte).
- **Card** solo dove sono l'affordance giusta (percorsi, certificati, KPI). Mai card annidate, mai griglie di card identiche all'infinito.
- Radius: card `rounded-2xl`, controlli `rounded-lg`. Ombre **calde** (`rgba(26,18,9,0.06–0.12)`).

## Componenti
- Base: **shadcn/ui** (Radix). Pattern admin (shell/KPI/data-table) da **dashboard-starter**, reskinnati ai nostri token. **Magic UI** per il motion.
- **Shell discente:** top-nav leggera (logo · I miei percorsi · Esami · Certificati · user-menu). **Shell admin:** sidebar densa (differita).

## Motion (Magic UI, con parsimonia)
- Progress animate, **number ticker** KPI, **reveal** del certificato, shimmer in loading.
- Curve **ease-out** (quart/expo), 150–300ms; niente bounce/elastic. Rispetta sempre `prefers-reduced-motion`.

## Stati visivi (badge percorso/esame)
Da iniziare (neutro) · In corso (arancione) · Pronto per l'esame (ambra) · Superato/Completato (verde) · Certificato (verde pieno) · In revisione (ambra) · Scaduto/Revocato (rosso/grigio).

## Vincoli che la UI deve riflettere (compliance)
Timer tempo minimo visibile e non aggirabile; "Avanti" bloccato finché la slide non è completata (server); quiz senza skip; certificato scaricabile solo da "emesso" (mai auto-emissione); sessione singola mostrata nel profilo.
