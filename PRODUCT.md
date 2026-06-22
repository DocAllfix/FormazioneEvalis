# PRODUCT.md — Evalis

register: product

> La landing pubblica è "brand register"; questo file copre il **prodotto** (app: dashboard, player, console). Fonte di verità per le scelte di design del prodotto.

## Cosa
Piattaforma LMS / certificazione delle competenze professionali, multi-tenant B2B+B2C. Prepara ed esamina per certificazioni (Auditor ISO, mestieri e professioni, settore bancario), con tracciamento a norma (Accordo Stato-Regioni 2025) e certificato verificabile con QR. Brand: **Evalis**.

## Utenti
- **Discente** (privato B2C o dipendente di un'azienda B2B): professionista che si prepara online e sostiene l'esame. Vuole sapere *dove sono, cosa faccio adesso, quanto manca*. Bassa tolleranza alle distrazioni.
- **Admin azienda** (B2B): referente che assegna percorsi, monitora lo stato, scarica report per audit/committenti. Vuole *controllo e prova*. (Vista costruita dopo.)
- **Staff piattaforma**: revisore certificati (UI differita).

## Tono di voce
Professionale, chiaro, **incoraggiante** per il discente; **affidabile, sobrio** per l'azienda. Italiano. Niente gergo, niente hype, niente em dash.

## Anti-reference (cosa NON essere)
- Non un LMS scolastico/giocoso: niente gamification chiassosa, badge ovunque, mascotte.
- Non un dashboard SaaS freddo navy/neon su nero.
- Non template AI generico: niente gradient-text, glassmorphism di default, griglie di card identiche, hero-metric, side-stripe.

## Principi
1. **Il server è la verità (compliance):** la UI mostra stato e chiama azioni, non decide. Tempo minimo di fruizione, quiz a estrazione e soglia, emissione certificato sono **server-authoritative**; nessuna logica di compliance nel client.
2. **Discente = focus:** una sola azione chiara ("Continua"), progresso sempre visibile, player senza distrazioni.
3. **Azienda = oversight:** panoramica a colpo d'occhio + drill-down + export.
4. **Coerenza col brand caldo (Ambra)** ma in chiave prodotto: sobrio, denso dove serve, accento arancione funzionale.
