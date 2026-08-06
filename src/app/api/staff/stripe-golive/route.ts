// MANUTENZIONE Stripe. Gira su Vercel, dove vive la chiave LIVE (che non e' leggibile dalla
// riga di comando): cosi' le operazioni sull'account si eseguono senza mai estrarre la chiave.
//
// TRE SERRATURE, perche' questa rotta sa creare prodotti e cambiare impostazioni fiscali
// sull'account che incassa:
//
//   1. SPENTA DI DEFAULT. Senza STRIPE_ADMIN_ENABLED=1 risponde 404 a chiunque, token
//      corretto compreso. In produzione resta spenta e si accende solo per il tempo dell'uso.
//   2. TOKEN DEDICATO (STRIPE_ADMIN_TOKEN), non piu' PREVIEW_TOKEN condiviso con l'anteprima
//      delle slide: un segreto per un solo scopo, cosi' comprometterne uno non apre l'altro.
//   3. CONFRONTO A TEMPO COSTANTE, per non far trapelare il segreto un carattere alla volta.
//
// Risponde 404 e non 401: a chi bussa non diciamo nemmeno che questa rotta esiste.
//
// Azioni (POST, body JSON):
//  { action: "status" }                      → modalità chiave, stato Stripe Tax, webhook esistenti, coupon
//  { action: "webhook" }                     → crea l'endpoint webhook (idempotente per URL) e RITORNA il secret (una tantum)
//  { action: "tax-setup" }                   → head office (dall'account) + registrazione IVA IT se mancante
//  { action: "coupons" }                     → coupon sconto azienda (idempotenti)
//  { action: "seed", tipo, slug }            → seed di UNA voce (corso|bundle) del listino
//  { action: "verify", tipo, slug, fase }    → verifica di UNA voce (corso|bundle|coupons)
//  { action: "movimenti", giorni? }          → SOLA LETTURA: pagamenti, sessioni, saldo e stato di verifica
//  { action: "prezzo-posti" }                → SOLA LETTURA: il prezzo per posto esiste su QUESTO account?

import { eq } from "drizzle-orm";
import { segretoValido } from "@/lib/segreti";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import {
  ensureCoupons,
  seedCorsoBySlug,
  seedBundleBySlug,
  verifyCorsoBySlug,
  verifyBundleBySlug,
  verifyCoupons,
} from "@/features/billing/listino-seed";

export const dynamic = "force-dynamic";

const WEBHOOK_URL = "https://evalisacademy.it/api/webhooks/stripe";
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
] as const;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 1), { status, headers: { "content-type": "application/json" } });
}

export async function POST(req: Request) {
  // serratura 1: spenta se non esplicitamente accesa
  if (process.env.STRIPE_ADMIN_ENABLED !== "1") return new Response(null, { status: 404 });
  // serrature 2 e 3: token suo, confrontato a tempo costante
  if (!segretoValido(process.env.STRIPE_ADMIN_TOKEN, req.headers.get("x-golive-token"))) {
    return new Response(null, { status: 404 });
  }

  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "assente";
  let body: { action?: string; tipo?: string; slug?: string; fase?: string; ricrea?: boolean; giorni?: number };
  try {
    body = await req.json();
  } catch {
    return json({ errore: "body JSON mancante" }, 400);
  }
  const stripe = getStripe();

  try {
    switch (body.action) {
      case "status": {
        const [settings, hooks, coup] = await Promise.all([
          stripe.tax.settings.retrieve().catch((e) => ({ errore: (e as Error).message })),
          stripe.webhookEndpoints.list({ limit: 20 }),
          verifyCoupons(stripe),
        ]);
        const tax = "errore" in (settings as Record<string, unknown>)
          ? settings
          : {
              status: (settings as { status?: string }).status,
              head_office: !!(settings as { head_office?: unknown }).head_office,
              default_tax_behavior: (settings as { defaults?: { tax_behavior?: string } }).defaults?.tax_behavior ?? null,
            };
        const registrations = await stripe.tax.registrations
          .list({ limit: 10 })
          .then((r) => r.data.map((x) => ({ country: x.country, status: x.status })))
          .catch((e) => [{ errore: (e as Error).message }]);
        return json({
          mode,
          tax,
          registrations,
          webhooks: hooks.data.map((h) => ({ id: h.id, url: h.url, status: h.status, eventi: h.enabled_events.length })),
          couponsOk: coup.pass,
          couponsDettagli: coup.dettagli,
        });
      }

      // Sola lettura: cos'e' successo davvero sull'account. Serve quando arriva una fattura
      // Stripe e non si capisce da dove venga — la domanda "abbiamo incassato qualcosa?" va
      // risposta coi movimenti, non con le impressioni.
      case "movimenti": {
        const giorni = Number(body.giorni ?? 45);
        const da = Math.floor(Date.now() / 1000) - giorni * 86400;
        const [pagamenti, sessioni, saldo, calcoli, account] = await Promise.all([
          stripe.paymentIntents.list({ limit: 20, created: { gte: da } }),
          stripe.checkout.sessions.list({ limit: 20, created: { gte: da } }),
          stripe.balance.retrieve(),
          // le voci addebitate sul saldo: e' li' che compaiono le commissioni di Stripe Tax
          stripe.balanceTransactions.list({ limit: 20, created: { gte: da } }),
          stripe.accounts.retrieve(),
        ]);
        return json({
          mode,
          finestra: `ultimi ${giorni} giorni`,
          // "Verifica il tuo account" nella guida di Stripe: se questi non sono entrambi veri,
          // l'incasso funziona ma i soldi restano fermi e nessuno lo dice esplicitamente
          account: {
            incassiAbilitati: account.charges_enabled,
            bonificiAbilitati: account.payouts_enabled,
            documentiMancanti: account.requirements?.currently_due ?? [],
            inScadenza: account.requirements?.eventually_due ?? [],
            scadenza: account.requirements?.current_deadline
              ? new Date(account.requirements.current_deadline * 1000).toISOString().slice(0, 10)
              : null,
          },
          pagamenti: pagamenti.data.map((p) => ({
            id: p.id,
            stato: p.status,
            importo: p.amount / 100,
            valuta: p.currency,
            quando: new Date(p.created * 1000).toISOString().slice(0, 16),
          })),
          sessioniCheckout: sessioni.data.map((s) => ({
            id: s.id,
            stato: s.status,
            pagamento: s.payment_status,
            importo: (s.amount_total ?? 0) / 100,
            quando: new Date(s.created * 1000).toISOString().slice(0, 16),
          })),
          saldo: saldo.available.map((a) => ({ importo: a.amount / 100, valuta: a.currency })),
          movimentiSaldo: calcoli.data.map((t) => ({
            tipo: t.type,
            descrizione: t.description,
            importo: t.amount / 100,
            valuta: t.currency,
            quando: new Date(t.created * 1000).toISOString().slice(0, 16),
          })),
        });
      }

      // Il prezzo per posto degli acquisti aziendali vive in una variabile d'ambiente, e un
      // prezzo di un ALTRO account (quello di prova) su live semplicemente non esiste: il
      // checkout aziendale fallirebbe. Non si puo' verificare leggendo la variabile — gli id
      // dei prezzi non dicono a quale account appartengono — si verifica chiedendolo a Stripe.
      case "prezzo-posti": {
        const id = process.env.STRIPE_SEAT_PRICE_ID;
        if (!id) return json({ mode, esito: "ROSSO", motivo: "STRIPE_SEAT_PRICE_ID non impostato" }, 422);

        try {
          const prezzo = await stripe.prices.retrieve(id, { expand: ["product"] });
          const prodotto = prezzo.product as { name?: string; active?: boolean };
          return json({
            mode,
            esito: prezzo.active ? "VERDE" : "ROSSO",
            motivo: prezzo.active ? "il prezzo esiste su questo account ed e' attivo" : "il prezzo esiste ma e' DISATTIVATO",
            prezzo: {
              id: prezzo.id,
              importo: (prezzo.unit_amount ?? 0) / 100,
              valuta: prezzo.currency,
              ricorrenza: prezzo.recurring ? `${prezzo.recurring.interval_count} ${prezzo.recurring.interval}` : "una tantum",
              comportamentoIva: prezzo.tax_behavior,
              prodotto: prodotto?.name ?? null,
            },
          });
        } catch (e) {
          // "No such price" = appartiene a un altro account. E' il caso che cerchiamo.
          const prezziVivi = await stripe.prices
            .list({ active: true, limit: 20, expand: ["data.product"] })
            .then((r) =>
              r.data
                .filter((p) => p.recurring)
                .map((p) => ({
                  id: p.id,
                  importo: (p.unit_amount ?? 0) / 100,
                  ricorrenza: `${p.recurring?.interval_count} ${p.recurring?.interval}`,
                  prodotto: (p.product as { name?: string })?.name ?? null,
                })),
            )
            .catch(() => []);
          return json(
            {
              mode,
              esito: "ROSSO",
              motivo: `il prezzo configurato NON esiste su questo account: ${(e as Error).message}`,
              idConfigurato: id,
              prezziRicorrentiDisponibili: prezziVivi,
              cosaFare: "impostare STRIPE_SEAT_PRICE_ID su uno degli id qui sopra, oppure crearne uno nuovo",
            },
            422,
          );
        }
      }

      case "webhook": {
        const hooks = await stripe.webhookEndpoints.list({ limit: 20 });
        const existing = hooks.data.find((h) => h.url === WEBHOOK_URL);
        // `ricrea: true` → elimina e ricrea identico: unico modo per riottenere il secret
        // (Stripe lo mostra solo alla creazione). Sicuro finché non c'è traffico reale.
        if (existing && body.ricrea === true) {
          await stripe.webhookEndpoints.del(existing.id);
        } else if (existing) {
          return json({
            mode,
            esistente: true,
            id: existing.id,
            status: existing.status,
            nota: "endpoint già presente: il secret è visibile solo alla creazione (Dashboard → reveal) o eliminalo e richiama questa azione",
          });
        }
        const created = await stripe.webhookEndpoints.create({
          url: WEBHOOK_URL,
          enabled_events: [...WEBHOOK_EVENTS],
          description: "Evalis Academy — provisioning acquisti/abbonamenti",
        });
        // il secret viene ritornato UNA volta: va messo subito in STRIPE_WEBHOOK_SECRET su Vercel
        return json({ mode, creato: true, id: created.id, secret: created.secret });
      }

      case "tax-setup": {
        const settings = await stripe.tax.settings.retrieve();
        const out: Record<string, unknown> = { statoIniziale: settings.status };
        if (!settings.head_office) {
          const account = await stripe.accounts.retrieve();
          const addr = account.company?.address ?? account.business_profile?.support_address ?? null;
          if (!addr?.line1 || !addr.postal_code || !addr.city) {
            return json({ mode, ...out, errore: "head office assente e indirizzo non ricavabile dall'account: serve l'indirizzo sede (via, cap, città)" }, 422);
          }
          await stripe.tax.settings.update({
            defaults: { tax_behavior: "exclusive" },
            head_office: { address: { line1: addr.line1, postal_code: addr.postal_code, city: addr.city, country: addr.country ?? "IT" } },
          });
          out.headOffice = "impostato dall'indirizzo account";
        }
        const regs = await stripe.tax.registrations.list({ limit: 10 });
        if (!regs.data.some((r) => r.country === "IT" && r.status !== "expired")) {
          await stripe.tax.registrations.create({
            country: "IT",
            active_from: "now",
            // sede in Italia → regime domestico standard (non OSS/small seller)
            country_options: { it: { type: "standard", standard: { place_of_supply_scheme: "standard" } } },
          });
          out.registrazioneIT = "creata (standard)";
        } else {
          out.registrazioneIT = "già presente";
        }
        const dopo = await stripe.tax.settings.retrieve();
        return json({ mode, ...out, statoFinale: dopo.status });
      }

      case "coupons":
        return json({ mode, esito: await ensureCoupons(stripe) });

      case "probe-taxcode": {
        // VERIFICA FISCALE: con quale codice imposta viene tassato un corso reale?
        // Se il Product non ha tax_code, Stripe usa il default dell'account: va confermato
        // che porti al 22% italiano, altrimenti l'IVA non verrebbe addebitata al cliente
        // (e l'azienda dovrebbe scorporarla dall'incasso).
        const settings = await stripe.tax.settings.retrieve();
        const defaultCode = settings.defaults?.tax_code ?? null;
        const [c] = await db
          .select({ title: course.title, stripeProductId: course.stripeProductId })
          .from(course)
          .where(eq(course.slug, String(body.slug ?? "aggiornamento-lead-auditor-iso-14001-2026")))
          .limit(1);
        const prod = c?.stripeProductId ? await stripe.products.retrieve(c.stripeProductId) : null;
        const codiceEffettivo = prod?.tax_code ?? defaultCode;
        const calc = await stripe.tax.calculations.create({
          currency: "eur",
          line_items: [
            {
              amount: 17900,
              reference: "verifica-corso",
              tax_behavior: "exclusive",
              ...(typeof codiceEffettivo === "string" ? { tax_code: codiceEffettivo } : {}),
            },
          ],
          customer_details: {
            address: { line1: "Via Roma 1", postal_code: "20100", city: "Milano", country: "IT" },
            address_source: "billing",
          },
        });
        return json({
          mode,
          corso: c?.title,
          taxCodeDefaultAccount: defaultCode,
          taxCodeProdotto: prod?.tax_code ?? null,
          taxCodeApplicato: typeof codiceEffettivo === "string" ? codiceEffettivo : String(codiceEffettivo),
          imponibile: 17900,
          ivaCalcolata: calc.tax_amount_exclusive,
          aliquota: calc.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal ?? null,
          totaleClientePagherebbe: calc.amount_total,
        });
      }

      case "probe-checkout": {
        // Prova a COSTO ZERO della catena live (nessun pagamento): product+price+customer
        // usa-e-getta, sessione con gli stessi parametri del checkout reale (Stripe Tax +
        // coupon azienda), lettura dei totali calcolati, poi pulizia. Serve a verificare
        // che con la chiave LIVE l'IVA venga davvero calcolata prima di seedare il listino.
        const prod = await stripe.products.create({ name: "VERIFICA go-live (da ignorare)" });
        const price = await stripe.prices.create({ product: prod.id, currency: "eur", unit_amount: 10000, tax_behavior: "exclusive" });
        const cust = await stripe.customers.create({
          email: "verifica-golive@evalisacademy.it",
          address: { line1: "Via Roma 1", postal_code: "20100", city: "Milano", country: "IT" },
        });
        const esito: Record<string, unknown> = {};
        try {
          const sess = await stripe.checkout.sessions.create({
            mode: "payment",
            customer: cust.id,
            line_items: [{ price: price.id, quantity: 1 }],
            discounts: [{ coupon: "azienda-20" }],
            automatic_tax: { enabled: true },
            billing_address_collection: "required",
            tax_id_collection: { enabled: true },
            customer_update: { address: "auto", name: "auto" },
            success_url: "https://evalisacademy.it/dashboard?purchase=success",
            cancel_url: "https://evalisacademy.it/dashboard?purchase=cancel",
          });
          const s = await stripe.checkout.sessions.retrieve(sess.id, { expand: ["total_details"] });
          esito.sessioneCreata = !!s.url;
          esito.imponibile = s.amount_subtotal;
          esito.scontoAzienda = s.total_details?.amount_discount ?? 0;
          esito.iva = s.total_details?.amount_tax ?? 0;
          esito.totale = s.amount_total;
          esito.ivaAttesa22 = Math.round(((s.amount_subtotal ?? 0) - (s.total_details?.amount_discount ?? 0)) * 0.22);
          esito.taxStatus = s.automatic_tax?.status ?? null; // "requires_location_inputs" = normale:
          // Checkout calcola l'IVA quando il cliente inserisce l'indirizzo. Per avere la PROVA
          // del calcolo qui, si interroga direttamente Stripe Tax con un indirizzo italiano.
          const calc = await stripe.tax.calculations.create({
            currency: "eur",
            line_items: [{ amount: 10000, reference: "verifica", tax_behavior: "exclusive", tax_code: "txcd_10103001" }],
            customer_details: {
              address: { line1: "Via Roma 1", postal_code: "20100", city: "Milano", country: "IT" },
              address_source: "billing",
            },
          });
          esito.calcoloIVA_imponibile = calc.amount_total - calc.tax_amount_exclusive;
          esito.calcoloIVA_imposta = calc.tax_amount_exclusive;
          esito.calcoloIVA_aliquota = calc.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal ?? null;
          await stripe.checkout.sessions.expire(sess.id).catch(() => {});
        } finally {
          await stripe.customers.del(cust.id).catch(() => {});
          await stripe.prices.update(price.id, { active: false }).catch(() => {});
          await stripe.products.update(prod.id, { active: false }).catch(() => {});
        }
        return json({ mode, ...esito });
      }

      case "seed": {
        if (!body.slug || !body.tipo) return json({ errore: "servono tipo e slug" }, 400);
        const esito =
          body.tipo === "corso" ? await seedCorsoBySlug(stripe, body.slug) : await seedBundleBySlug(stripe, body.slug);
        return json({ mode, esito });
      }

      case "verify": {
        const fase = body.fase === "ufficiale" ? "ufficiale" : "lancio";
        if (body.tipo === "coupons") return json({ mode, ...(await verifyCoupons(stripe)) });
        if (!body.slug || !body.tipo) return json({ errore: "servono tipo e slug" }, 400);
        const v =
          body.tipo === "corso"
            ? await verifyCorsoBySlug(stripe, body.slug, fase)
            : await verifyBundleBySlug(stripe, body.slug, fase);
        return json({ mode, slug: body.slug, ...v });
      }

      default:
        return json({ errore: "action sconosciuta" }, 400);
    }
  } catch (e) {
    return json({ mode, errore: (e as Error).message }, 500);
  }
}
