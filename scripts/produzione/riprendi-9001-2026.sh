#!/usr/bin/env bash
# RIPRESA dei corsi ISO 9001:2026 dopo l'acquisto dello spazio su Cloudflare Stream.
# Da lanciare dalla radice del repo:  bash scripts/produzione/riprendi-9001-2026.sh
#
# Ogni passo è idempotente: se qualcosa è già stato fatto, lo salta. Se un passo fallisce
# lo script si ferma lì, senza lasciare il lavoro a metà.
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "== 1/7 · caricamento clip su Cloudflare Stream (riprende dalle mancanti)"
node scripts/produzione/_upload-fast.mjs 9001v26 16
node scripts/produzione/_upload-fast.mjs agg9001 16

echo "== 2/7 · riconciliazione dal vero (legge Cloudflare, non i nostri file)"
node scripts/produzione/_riconcilia.mjs 9001v26
node scripts/produzione/_riconcilia.mjs agg9001

echo "== 3/7 · riuso delle clip dell'edizione precedente (SEMPRE dopo la riconciliazione)"
node scripts/produzione/_riuso-clip.mjs 9001v26

echo "== 4/7 · manifest aggiornati"
node scripts/produzione/make-manifest.mjs 9001v26 --slides-dir slide-in/9001v26 \
  --title "Auditor/Lead Auditor ISO 9001:2026 — Sistemi di gestione per la qualità"
node scripts/produzione/make-manifest.mjs agg9001 --slides-dir slide-in/agg9001 \
  --title "Aggiornamento ISO 9001:2026 — dalla 2015 alla 2026"
npx tsx scripts/produzione/_valida-manifest.ts 9001v26 agg9001

echo "== 5/7 · prova a vuoto dell'ingest (valida monte-ore e accoppiamento clip-audio)"
npx tsx scripts/produzione/build-course.ts 9001v26 --dry-run
npx tsx scripts/produzione/build-course.ts agg9001 --dry-run

echo "== 6/7 · ingest vero"
npx tsx scripts/produzione/build-course.ts 9001v26
npx tsx scripts/produzione/build-course.ts agg9001

echo "== 7/8 · verifiche in piattaforma, slide per slide e quiz per quiz"
npx tsx scripts/produzione/verifica-corso.ts 9001v26
npx tsx scripts/produzione/verifica-corso.ts agg9001
npx tsx scripts/produzione/_qa-quiz.ts
npx tsx scripts/produzione/_populate-slide-ratio.ts
npx tsx scripts/produzione/_verify-all-slides.ts

echo "== 8/8 · report finale, una riga per slide"
npx tsx scripts/produzione/report-finale.ts 9001v26 agg9001

echo
echo "FATTO. Resta, con l'ok dell'utente, la pubblicazione commerciale"
echo "(prezzi e sostituzione nei pacchetti, tenendo acquistabile il corso 2015)."
