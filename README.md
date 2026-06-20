# FormazioneEvalis

Piattaforma **LMS multi-tenant** (B2B seat-based + B2C one-off) per l'erogazione di corsi di formazione professionale (sicurezza D.Lgs. 81/08 + Accordo Stato-Regioni 2025, ISO, auditor). Costruiamo solo l'**erogazione**: accesso, tracciamento fruizione antifrode, quiz, certificati, pagamenti. I corsi arrivano già pronti da monte (video con avatar + slide + quiz).

> 📐 **La fonte di verità architetturale è [`ARCHITETTURA.md`](./ARCHITETTURA.md)**: stack, 12 moduli, schema DB, criteri di successo. Le linee guida di lavoro sono in [`CLAUDE.md`](./CLAUDE.md).

## Stack
Next.js 15 (App Router, TS) · Drizzle ORM · Supabase EU (Postgres+Storage+RLS) · better-auth (org/seat) · Stripe · Cloudflare Stream · `<video>`+hls.js (player antifrode) · scorm-again · Sentry · Brevo.

## Struttura
```
src/app/        route (marketing/auth/dashboard/learn/api/verify)
src/features/   moduli di dominio (auth, billing, courses, player, tracking, quiz, certificates, audit)
src/lib/        infra: db (schema per cluster), auth, supabase, cloudflare, env
references/      cloni di studio (git-ignored) — analisi in references/_REPORT/
```

## Comandi
```bash
npm install            # installa le dipendenze (Step 1)
npm run dev            # avvia in sviluppo
npm run db:generate    # genera le migrazioni Drizzle
npm run db:migrate     # applica le migrazioni
```

## Convenzioni di contribuzione
- **Regola inderogabile sui commit:** i commit sono firmati **solo come `DocAllfix`** e **non devono mai contenere alcuna firma o co-author di terzi/assistenti**. Un hook `commit-msg` (`.githooks/`) lo verifica automaticamente.
- Modifiche chirurgiche, niente codice speculativo, niente microservizi prematuri (vedi `CLAUDE.md`).
- Lo schema `compliance` (audit append-only) non si tocca "di striscio".
