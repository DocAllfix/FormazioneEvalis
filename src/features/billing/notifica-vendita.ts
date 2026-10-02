// NOTIFICA DI VENDITA al committente: a ogni acquisto vero (corso o pacchetto) una mail con
// tutto ciò che serve per emettere la fattura — chi ha comprato, cosa, imponibile, IVA, totale e
// i dati fiscali raccolti al checkout (P.IVA da Stripe, codice fiscale e SDI/PEC dai campi
// facoltativi in checkout.ts). La fattura elettronica la emette il committente: qui solo i dati.
//
// Tre regole, tutte provate in billing-notifica.test.ts:
//  1. SOLO pagamenti live: gli acquisti di prova (test, e2e) non devono finire nella sua casella.
//  2. MAI pagamenti avvenuti prima di NOTIFICHE_DAL: i clienti di prima non devono arrivargli
//     come vendite nuove, nemmeno se Stripe rimanda un vecchio evento.
//  3. Best-effort: chi la chiama (il webhook) la protegge con un try/catch, perché una mail non
//     partita non deve mai far ripetere il provisioning di un corso già pagato.

import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bundle, course } from "@/lib/db/schema";
import { inviaEmailAssistenza } from "@/lib/email/resend";
import { renderEmail, esc } from "@/lib/email/layout";

export const EMAIL_VENDITE = "evaliscert@libero.it";
/** Prima di questo istante nessuna notifica: è il momento in cui la funzione è stata introdotta. */
export const NOTIFICHE_DAL = new Date("2026-10-02T05:44:00Z");

/** Le tre condizioni insieme: live, acquisto nostro, avvenuto dopo NOTIFICHE_DAL. */
export function deveNotificare(event: Stripe.Event): boolean {
  if (!event.livemode || event.type !== "checkout.session.completed") return false;
  if (event.created * 1000 < NOTIFICHE_DAL.getTime()) return false;
  const kind = (event.data.object as Stripe.Checkout.Session).metadata?.kind;
  return kind === "course_purchase" || kind === "bundle_purchase";
}

export type DatiVendita = {
  quando: Date;
  pagato: boolean;
  valuta: string;
  imponibileCents: number | null;
  scontoCents: number;
  ivaCents: number;
  totaleCents: number | null;
  ragioneSociale: string | null;
  nome: string | null;
  email: string | null;
  telefono: string | null;
  indirizzo: string | null;
  partiteIva: string[];
  codiceFiscale: string | null;
  sdiPec: string | null;
  paymentIntent: string | null;
};

const t = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Dalla sessione di checkout ai dati per la fattura. Funzione PURA: niente rete, niente DB. */
export function datiVendita(s: Stripe.Checkout.Session, created: number): DatiVendita {
  // business_name e individual_name arrivano nel payload (visti nei pagamenti veri) ma la
  // versione della libreria Stripe in uso non li dichiara ancora
  const cd = s.customer_details as (Stripe.Checkout.Session.CustomerDetails & { business_name?: string | null; individual_name?: string | null }) | null;
  const a = cd?.address;
  const campo = (key: string) => t(s.custom_fields?.find((f) => f.key === key)?.text?.value);
  const sconto = s.total_details?.amount_discount ?? 0;
  return {
    quando: new Date(created * 1000),
    pagato: s.payment_status === "paid",
    valuta: (s.currency ?? "eur").toUpperCase(),
    imponibileCents: s.amount_subtotal == null ? null : s.amount_subtotal - sconto,
    scontoCents: sconto,
    ivaCents: s.total_details?.amount_tax ?? 0,
    totaleCents: s.amount_total,
    ragioneSociale: t(cd?.business_name),
    nome: t(cd?.individual_name) ?? t(cd?.name),
    email: t(cd?.email),
    telefono: t(cd?.phone),
    indirizzo: a
      ? [t(a.line1), t(a.line2), [t(a.postal_code), t(a.city), t(a.state)].filter(Boolean).join(" "), t(a.country)]
          .filter(Boolean)
          .join(", ") || null
      : null,
    partiteIva: (cd?.tax_ids ?? []).map((x) => t(x.value)).filter((v): v is string => !!v),
    codiceFiscale: campo("codicefiscale")?.toUpperCase() ?? null,
    sdiPec: campo("sdipec"),
    paymentIntent: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null,
  };
}

const euro = (cents: number | null, valuta: string) =>
  cents == null ? "—" : new Intl.NumberFormat("it-IT", { style: "currency", currency: valuta }).format(cents / 100);

/** Oggetto e corpo della mail. PURA: i valori del cliente passano tutti da esc(). */
export function mailVendita(d: DatiVendita, prodotto: string): { subject: string; html: string } {
  const quando = d.quando.toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "long", timeStyle: "short" });
  const cliente = d.ragioneSociale ?? d.nome ?? d.email ?? "cliente";
  const riga = (etichetta: string, valore: string | null) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#8A8073;white-space:nowrap;vertical-align:top;">${etichetta}</td>` +
    `<td style="padding:6px 0;color:#1A1209;"><strong>${valore ? esc(valore) : "<span style=\"color:#8A8073;font-weight:400\">non indicato</span>"}</strong></td></tr>`;
  const tabella = (righe: string[]) =>
    `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.5;">${righe.join("")}</table>`;
  const html = renderEmail({
    previewText: `${prodotto} · ${euro(d.totaleCents, d.valuta)} · ${cliente}`,
    heading: "Nuova vendita",
    body: [
      `${d.pagato ? "Pagamento ricevuto" : "<strong>Pagamento NON ancora incassato</strong>"} il ${esc(quando)}.`,
      tabella([
        riga("Prodotto", prodotto),
        riga("Imponibile", euro(d.imponibileCents, d.valuta)),
        ...(d.scontoCents ? [riga("di cui sconto applicato", euro(d.scontoCents, d.valuta))] : []),
        riga("IVA", euro(d.ivaCents, d.valuta)),
        riga("Totale pagato", euro(d.totaleCents, d.valuta)),
      ]),
      "<strong>Dati per la fattura</strong>",
      tabella([
        riga("Ragione sociale", d.ragioneSociale),
        riga("Nome", d.nome),
        riga("Partita IVA", d.partiteIva.join(", ") || null),
        riga("Codice fiscale", d.codiceFiscale),
        riga("Codice SDI o PEC", d.sdiPec),
        riga("Indirizzo", d.indirizzo),
        riga("Email", d.email),
        riga("Telefono", d.telefono),
      ]),
    ],
    ...(d.paymentIntent
      ? { button: { label: "Apri il pagamento su Stripe", url: `https://dashboard.stripe.com/payments/${d.paymentIntent}` } }
      : {}),
    footerExtra: "Notifica interna di vendita: la ricevuta il cliente l'ha già avuta da Stripe, la fattura elettronica va emessa da voi.",
  });
  return { subject: `Nuova vendita: ${prodotto} · ${euro(d.totaleCents, d.valuta)} · ${cliente}`, html };
}

async function nomeProdotto(s: Stripe.Checkout.Session): Promise<string> {
  const m = s.metadata ?? {};
  const pacchetto = m.kind === "bundle_purchase";
  try {
    const [r] = pacchetto
      ? await db.select({ titolo: bundle.title }).from(bundle).where(eq(bundle.id, m.bundleId ?? "")).limit(1)
      : await db.select({ titolo: course.title }).from(course).where(eq(course.id, m.courseId ?? "")).limit(1);
    if (r?.titolo) return r.titolo;
  } catch {
    // un titolo che non si legge non deve fermare la mail: basta il tipo
  }
  return pacchetto ? "Pacchetto" : "Corso";
}

/** Manda la notifica se l'evento la merita (vedi deveNotificare). */
export async function inviaNotificaVendita(event: Stripe.Event): Promise<{ sent: boolean }> {
  if (!deveNotificare(event)) return { sent: false };
  const s = event.data.object as Stripe.Checkout.Session;
  const { subject, html } = mailVendita(datiVendita(s, event.created), await nomeProdotto(s));
  return inviaEmailAssistenza({ to: [EMAIL_VENDITE], subject, html });
}
