// GO-LIVE Stripe (route di MANUTENZIONE one-shot, da RIMUOVERE dopo il lancio):
// gira su Vercel dove vive la chiave Stripe LIVE (sensibile: non leggibile dalla CLI),
// così l'intero setup si esegue senza mai estrarre la chiave. Accesso: header
// x-golive-token === PREVIEW_TOKEN (stesso segreto della /anteprima staff); 404 altrimenti.
//
// Azioni (POST, body JSON):
//  { action: "status" }                      → modalità chiave, stato Stripe Tax, webhook esistenti, coupon
//  { action: "webhook" }                     → crea l'endpoint webhook (idempotente per URL) e RITORNA il secret (una tantum)
//  { action: "tax-setup" }                   → head office (dall'account) + registrazione IVA IT se mancante
//  { action: "coupons" }                     → coupon sconto azienda (idempotenti)
//  { action: "seed", tipo, slug }            → seed di UNA voce (corso|bundle) del listino
//  { action: "verify", tipo, slug, fase }    → verifica di UNA voce (corso|bundle|coupons)

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
  const token = process.env.PREVIEW_TOKEN;
  if (!token || req.headers.get("x-golive-token") !== token) return new Response(null, { status: 404 });

  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "assente";
  let body: { action?: string; tipo?: string; slug?: string; fase?: string };
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

      case "webhook": {
        const hooks = await stripe.webhookEndpoints.list({ limit: 20 });
        const existing = hooks.data.find((h) => h.url === WEBHOOK_URL);
        if (existing) {
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
            country_options: { it: { type: "standard" } },
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
