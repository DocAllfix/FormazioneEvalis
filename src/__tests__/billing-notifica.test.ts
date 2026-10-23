// Notifica di vendita al committente: QUANDO parte (solo live, solo acquisti nostri, mai per i
// pagamenti avvenuti prima di NOTIFICHE_DAL) e COSA contiene (i dati per la fattura, con i valori
// del cliente sempre escapati). Nessuna rete, nessun DB.

import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { deveNotificare, datiVendita, mailVendita, NOTIFICHE_DAL, PARTNER_DA_VERIFICARE } from "../features/billing/notifica-vendita";
import { normalizzaCodicePartner } from "../features/partner/codici";
import { CAMPI_FATTURA } from "../features/billing/checkout";

const DOPO = Math.floor(NOTIFICHE_DAL.getTime() / 1000) + 60;
const PRIMA = Math.floor(NOTIFICHE_DAL.getTime() / 1000) - 60;

const sessione = (extra: Record<string, unknown> = {}) => ({
  mode: "payment",
  payment_status: "paid",
  currency: "eur",
  amount_subtotal: 22300,
  amount_total: 21762,
  total_details: { amount_discount: 4460, amount_tax: 3922, amount_shipping: 0 },
  payment_intent: "pi_123",
  metadata: { kind: "course_purchase", userId: "u1", courseId: "c1", orgId: "o1" },
  customer_details: {
    name: "Mario Rossi",
    individual_name: "Mario Rossi",
    business_name: "Rossi Consulenze S.r.l.",
    email: "mario@example.it",
    phone: "+39 333 0000000",
    address: { line1: "Via Roma 1", line2: null, postal_code: "00100", city: "Roma", state: "RM", country: "IT" },
    tax_ids: [{ type: "eu_vat", value: "IT01234567890" }],
  },
  custom_fields: [
    { key: "codicefiscale", text: { value: " rssmra80a01h501u " } },
    { key: "sdipec", text: { value: "M5UXCR1" } },
  ],
  ...extra,
});

const ev = (o: { livemode?: boolean; created?: number; type?: string; object?: unknown } = {}) =>
  ({
    id: "evt_1",
    type: o.type ?? "checkout.session.completed",
    livemode: o.livemode ?? true,
    created: o.created ?? DOPO,
    data: { object: o.object ?? sessione() },
  }) as unknown as Stripe.Event;

describe("deveNotificare", () => {
  it("un acquisto live, avvenuto dopo l'introduzione → sì", () => {
    expect(deveNotificare(ev())).toBe(true);
  });

  it("anche per i pacchetti", () => {
    expect(deveNotificare(ev({ object: sessione({ metadata: { kind: "bundle_purchase", bundleId: "b1" } }) }))).toBe(true);
  });

  it("un pagamento di PRIMA, anche se Stripe ne rimanda l'evento oggi → mai", () => {
    expect(deveNotificare(ev({ created: PRIMA }))).toBe(false);
  });

  it("i pagamenti di prova (test, e2e) → mai", () => {
    expect(deveNotificare(ev({ livemode: false }))).toBe(false);
  });

  it("checkout completato ma non ancora incassato → no; a incasso avvenuto → sì (audit C1)", () => {
    expect(deveNotificare(ev({ object: sessione({ payment_status: "unpaid" }) }))).toBe(false);
    expect(deveNotificare(ev({ type: "checkout.session.async_payment_succeeded" }))).toBe(true);
    expect(deveNotificare(ev({ type: "checkout.session.async_payment_failed", object: sessione({ payment_status: "unpaid" }) }))).toBe(false);
  });

  it("coupon al 100%: nessun pagamento richiesto, ma è una vendita → sì", () => {
    expect(deveNotificare(ev({ object: sessione({ payment_status: "no_payment_required", amount_total: 0 }) }))).toBe(true);
  });

  it("eventi che non sono un acquisto completato → mai", () => {
    expect(deveNotificare(ev({ type: "charge.refunded" }))).toBe(false);
    expect(deveNotificare(ev({ object: sessione({ metadata: {} }) }))).toBe(false);
  });
});

describe("datiVendita", () => {
  it("raccoglie importi e dati fiscali dalla sessione", () => {
    const d = datiVendita(sessione() as unknown as Stripe.Checkout.Session, DOPO);
    expect(d).toMatchObject({
      pagato: true,
      valuta: "EUR",
      imponibileCents: 17840, // 223,00 − 44,60 di sconto
      scontoCents: 4460,
      ivaCents: 3922,
      totaleCents: 21762,
      ragioneSociale: "Rossi Consulenze S.r.l.",
      nome: "Mario Rossi",
      partiteIva: ["IT01234567890"],
      codiceFiscale: "RSSMRA80A01H501U",
      sdiPec: "M5UXCR1",
      indirizzo: "Via Roma 1, 00100 Roma RM, IT",
      paymentIntent: "pi_123",
    });
  });

  it("senza i campi facoltativi non si rompe: restano vuoti", () => {
    const d = datiVendita(sessione({ custom_fields: [], customer_details: null }) as unknown as Stripe.Checkout.Session, DOPO);
    expect(d.codiceFiscale).toBeNull();
    expect(d.sdiPec).toBeNull();
    expect(d.partiteIva).toEqual([]);
    expect(d.indirizzo).toBeNull();
  });
});

describe("mailVendita", () => {
  it("riporta prodotto, totale e dati per la fattura", () => {
    const { subject, html } = mailVendita(datiVendita(sessione() as unknown as Stripe.Checkout.Session, DOPO), "Auditor ISO 9001");
    expect(subject).toContain("Auditor ISO 9001");
    expect(subject).toContain("217,62");
    for (const s of ["178,40", "39,22", "IT01234567890", "RSSMRA80A01H501U", "M5UXCR1", "Via Roma 1", "dashboard.stripe.com/payments/pi_123"]) {
      expect(html).toContain(s);
    }
  });

  it("i valori scritti dal cliente non diventano HTML", () => {
    const s = sessione({ custom_fields: [{ key: "sdipec", text: { value: "<script>x</script>" } }] });
    const { html } = mailVendita(datiVendita(s as unknown as Stripe.Checkout.Session, DOPO), "Corso");
    expect(html).not.toContain("<script>x");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("CAMPI_FATTURA", () => {
  it("SDI/PEC obbligatorio (almeno 6 caratteri), codice fiscale facoltativo", () => {
    expect(CAMPI_FATTURA.custom_fields.map((c) => [c.key, c.optional, c.text?.minimum_length])).toEqual([
      ["sdipec", false, 6],
      ["codicefiscale", true, undefined],
    ]);
  });

  it("dice ai privati di scrivere 0000000 (sette zeri), nell'etichetta e sopra il pulsante", () => {
    expect(CAMPI_FATTURA.custom_fields[0].label.custom).toContain("0000000");
    const nota = (CAMPI_FATTURA.custom_text.submit as { message: string }).message;
    expect(nota).toContain("0000000");
    expect(nota.length).toBeLessThanOrEqual(1200); // limite Stripe
    expect("0000000".length).toBeGreaterThanOrEqual(CAMPI_FATTURA.custom_fields[0].text!.minimum_length!);
  });

  it("etichette entro il limite di Stripe (50 caratteri)", () => {
    for (const c of CAMPI_FATTURA.custom_fields) expect(c.label.custom.length).toBeLessThanOrEqual(50);
  });
});

describe("mailVendita con 0000000", () => {
  it("lo spiega al committente: privato senza codice destinatario", () => {
    const s = sessione({ custom_fields: [{ key: "sdipec", text: { value: "0000000" } }] });
    const { html } = mailVendita(datiVendita(s as unknown as Stripe.Checkout.Session, DOPO), "Corso");
    expect(html).toContain("0000000 (privato, nessun codice destinatario)");
  });
});

describe("codice partner nella mail di vendita (NGR, 23/10/2026)", () => {
  const d = () => datiVendita(sessione() as unknown as Stripe.Checkout.Session, DOPO);

  it("con un partner: riga «Partner» e partner nell'oggetto", () => {
    const { subject, html } = mailVendita(d(), "Corso", "NGR");
    expect(html).toContain("Partner");
    expect(html).toContain("NGR");
    expect(subject).toMatch(/· partner NGR$/);
  });

  it("senza partner: nessuna riga e oggetto come prima", () => {
    const { subject, html } = mailVendita(d(), "Corso");
    expect(html).not.toContain("Partner");
    expect(subject).not.toContain("partner");
  });

  it("partner non letto: la mail lo dice, così la provvigione non si perde in silenzio", () => {
    const { subject, html } = mailVendita(d(), "Corso", PARTNER_DA_VERIFICARE);
    expect(html).toContain("da verificare");
    expect(subject).not.toContain("partner");
  });

  it("il codice si ripulisce e si accetta solo se è di un partner", () => {
    expect(normalizzaCodicePartner(" ngr ")).toBe("NGR");
    expect(normalizzaCodicePartner("N G R")).toBe("NGR");
    expect(normalizzaCodicePartner("")).toBeNull();
    expect(normalizzaCodicePartner(undefined)).toBeNull();
    expect(normalizzaCodicePartner("NGX")).toBe("invalido");
    expect(normalizzaCodicePartner(42)).toBe("invalido");
  });
});
