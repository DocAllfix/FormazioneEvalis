# slide-in — cartella d'ingresso delle slide di claude design

Qui carichi le slide HTML generate da claude design, **una cartella per corso**.

## Come caricare
- Un file **per slide**, nome file = **l'ID della slide** (es. `19011_m01_s001.html`).
- Metti i file dentro `slide-in/<corso>/` (es. `slide-in/19011/`).
- Ogni file deve avere come radice un `<section>` (formato del template).

## Come analizzarle (slide per slide, condizioni ESATTE del player)
```
node scripts/produzione/gate-slides.mjs <corso> --dir slide-in/<corso>
```
Esempio: `node scripts/produzione/gate-slides.mjs 19011 --dir slide-in/19011`

Controlla (S1–S9): ID/completezza, radice <section>, background hex, nessuna risorsa
esterna, niente script, altezza/overflow reale a 1280px (+ screenshot), titolo del
copione rintracciabile, font ammessi, nessun quiz funzionante.

## Output
- `produzione/_staging/slide-gates/<corso>/contact-sheet.html` → **miniature cliccabili** (revisione visiva)
- `produzione/_staging/slide-gates/<corso>/report.json` → esito per slide (PASS/WARN/FAIL + motivi)

## Validare il TEMPLATE (non un corso)
```
node scripts/produzione/gate-slides.mjs --kit <cartella-col-template>
```
