// Test puro della mappatura evento Stripe → azione (planFromEvent) e della risoluzione
// composizione bundle (resolveBundleCourseIds). Nessuna rete/DB.

import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { planFromEvent, datiPagamentoDaEvento } from "../features/billing/events";
import { resolveBundleCourseIds, type BundleLink } from "../features/billing/bundles";
import { companyDiscountPercent, COMPANY_COUPONS } from "../features/billing/discounts";
import { chiaveIdempotenza } from "../features/billing/idempotenza";

const ev = (type: string, object: unknown) => ({ type, data: { object } }) as unknown as Stripe.Event;

describe("planFromEvent", () => {
  it("checkout payment (course_purchase) → course_purchase", () => {
    const p = planFromEvent(
      ev("checkout.session.completed", {
        mode: "payment",
        payment_status: "paid",
        metadata: { kind: "course_purchase", userId: "u1", courseId: "c1", orgId: "o1" },
      }),
    );
    expect(p).toEqual({ action: "course_purchase", userId: "u1", courseId: "c1", orgId: "o1" });
  });

  it("checkout subscription → ignore (gestito dagli eventi subscription)", () => {
    const p = planFromEvent(
      ev("checkout.session.completed", { mode: "subscription", metadata: { kind: "seat_subscription", orgId: "o1" } }),
    );
    expect(p.action).toBe("ignore");
  });

  it("subscription.updated → subscription_upsert (quantity/status/customer/plan)", () => {
    const p = planFromEvent(
      ev("customer.subscription.updated", {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        items: { data: [{ quantity: 5, price: { id: "price_1" } }] },
      }),
    );
    expect(p).toEqual({
      action: "subscription_upsert",
      stripeCustomerId: "cus_1",
      subscriptionId: "sub_1",
      quantity: 5,
      status: "active",
      plan: "price_1",
    });
  });

  it("subscription.deleted → subscription_revoke (customer come oggetto)", () => {
    const p = planFromEvent(
      ev("customer.subscription.deleted", { id: "sub_1", customer: { id: "cus_1" }, status: "canceled", items: { data: [] } }),
    );
    expect(p).toEqual({ action: "subscription_revoke", stripeCustomerId: "cus_1" });
  });

  it("evento non rilevante → ignore", () => {
    expect(planFromEvent(ev("invoice.paid", {})).action).toBe("ignore");
  });

  it("checkout payment (bundle_purchase) → bundle_purchase, con e senza corso a scelta", () => {
    const conScelta = planFromEvent(
      ev("checkout.session.completed", {
        mode: "payment",
        payment_status: "paid",
        metadata: { kind: "bundle_purchase", userId: "u1", bundleId: "b1", chosenCourseId: "c9", orgId: "o1" },
      }),
    );
    expect(conScelta).toEqual({ action: "bundle_purchase", userId: "u1", bundleId: "b1", chosenCourseId: "c9", orgId: "o1" });

    const senzaScelta = planFromEvent(
      ev("checkout.session.completed", {
        mode: "payment",
        payment_status: "paid",
        metadata: { kind: "bundle_purchase", userId: "u1", bundleId: "b1", orgId: "o1" },
      }),
    );
    expect(senzaScelta).toEqual({ action: "bundle_purchase", userId: "u1", bundleId: "b1", chosenCourseId: undefined, orgId: "o1" });
  });

  it("bundle_purchase con metadata incompleti → ignore", () => {
    const p = planFromEvent(
      ev("checkout.session.completed", { mode: "payment", metadata: { kind: "bundle_purchase", userId: "u1", orgId: "o1" } }),
    );
    expect(p.action).toBe("ignore");
  });
});

describe("planFromEvent — l'accesso si dà solo a pagamento incassato (audit C1)", () => {
  const corso = (payment_status: string | undefined) => ({
    mode: "payment",
    payment_status,
    metadata: { kind: "course_purchase", userId: "u1", courseId: "c1", orgId: "o1" },
  });
  const acquisto = { action: "course_purchase", userId: "u1", courseId: "c1", orgId: "o1" };

  it("checkout completato ma NON ancora incassato (metodi a conferma ritardata) → nessun accesso", () => {
    expect(planFromEvent(ev("checkout.session.completed", corso("unpaid"))).action).toBe("ignore");
    expect(planFromEvent(ev("checkout.session.completed", corso(undefined))).action).toBe("ignore");
  });

  it("checkout completato e pagato → accesso", () => {
    expect(planFromEvent(ev("checkout.session.completed", corso("paid")))).toEqual(acquisto);
  });

  it("coupon al 100% (nessun pagamento richiesto) → accesso", () => {
    expect(planFromEvent(ev("checkout.session.completed", corso("no_payment_required")))).toEqual(acquisto);
  });

  it("pagamento ritardato poi riuscito → accesso; fallito → nessun accesso", () => {
    expect(planFromEvent(ev("checkout.session.async_payment_succeeded", corso("paid")))).toEqual(acquisto);
    expect(planFromEvent(ev("checkout.session.async_payment_failed", corso("unpaid"))).action).toBe("ignore");
  });

  it("vale anche per i pacchetti", () => {
    const pacchetto = (payment_status: string) => ({
      mode: "payment",
      payment_status,
      metadata: { kind: "bundle_purchase", userId: "u1", bundleId: "b1", orgId: "o1" },
    });
    expect(planFromEvent(ev("checkout.session.completed", pacchetto("unpaid"))).action).toBe("ignore");
    expect(planFromEvent(ev("checkout.session.async_payment_succeeded", pacchetto("paid"))).action).toBe("bundle_purchase");
  });
});

describe("resolveBundleCourseIds", () => {
  const links: BundleLink[] = [
    { courseId: "c-base", role: "included" },
    { courseId: "la1", role: "eligible" },
    { courseId: "la2", role: "eligible" },
  ];

  it("fixed → tutti gli included, chosen vietato", () => {
    const fixedLinks: BundleLink[] = [
      { courseId: "a", role: "included" },
      { courseId: "b", role: "included" },
    ];
    expect(resolveBundleCourseIds({ kind: "fixed" }, fixedLinks)).toEqual(["a", "b"]);
    expect(() => resolveBundleCourseIds({ kind: "fixed" }, fixedLinks, "a")).toThrow(/non prevede/);
  });

  it("fixed senza corsi → errore", () => {
    expect(() => resolveBundleCourseIds({ kind: "fixed" }, [])).toThrow(/senza corsi/);
  });

  it("pick_one → included + scelto; senza scelta → errore", () => {
    expect(resolveBundleCourseIds({ kind: "pick_one" }, links, "la2")).toEqual(["c-base", "la2"]);
    expect(() => resolveBundleCourseIds({ kind: "pick_one" }, links)).toThrow(/Seleziona/);
  });

  it("pick_one con scelta non eligible (o included spacciato per scelta) → errore", () => {
    expect(() => resolveBundleCourseIds({ kind: "pick_one" }, links, "estraneo")).toThrow(/non valido/);
    expect(() => resolveBundleCourseIds({ kind: "pick_one" }, links, "c-base")).toThrow(/non valido/);
  });
});

describe("companyDiscountPercent (sconto azienda automatico)", () => {
  it("org personale → mai sconto, anche con acquisti precedenti", () => {
    expect(companyDiscountPercent({ isCompanyOrg: false, priorCoursePurchases: 0 })).toBe(0);
    expect(companyDiscountPercent({ isCompanyOrg: false, priorCoursePurchases: 10 })).toBe(0);
  });

  it("azienda: 1° iscritto pieno, dal 2° −20%, dal 5° −30%", () => {
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 0 })).toBe(0); // 1° iscritto
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 1 })).toBe(20); // 2°
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 3 })).toBe(20); // 4°
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 4 })).toBe(30); // 5°
    expect(companyDiscountPercent({ isCompanyOrg: true, priorCoursePurchases: 9 })).toBe(30); // 10°
  });

  it("le % mappano su coupon Stripe con ID fisso", () => {
    expect(COMPANY_COUPONS[20]).toBe("azienda-20");
    expect(COMPANY_COUPONS[30]).toBe("azienda-30");
  });
});

describe("datiPagamentoDaEvento (registro finanziario)", () => {
  const evt = (type: string, object: unknown, extra: Record<string, unknown> = {}) =>
    ({ id: "evt_1", type, created: 1_760_000_000, livemode: true, data: { object }, ...extra }) as unknown as Stripe.Event;

  it("checkout completato → importo, valuta, sessione, intent, org e utente", () => {
    const d = datiPagamentoDaEvento(
      evt("checkout.session.completed", {
        id: "cs_123",
        customer: "cus_1",
        payment_intent: "pi_9",
        amount_total: 1220,
        currency: "eur",
        metadata: { orgId: "o1", userId: "u1" },
      }),
    );
    expect(d).toMatchObject({
      stripeEventId: "evt_1",
      type: "checkout.session.completed",
      livemode: true,
      stripeCustomerId: "cus_1",
      checkoutSessionId: "cs_123",
      paymentIntentId: "pi_9",
      organizationId: "o1",
      userId: "u1",
      amountTotal: 1220,
      currency: "eur",
    });
    // `occurredAt` viene da event.created, non dall'ora in cui scriviamo
    expect(d.occurredAt.getTime()).toBe(1_760_000_000_000);
  });

  it("customer espanso a oggetto → si prende l'id", () => {
    const d = datiPagamentoDaEvento(evt("checkout.session.completed", { id: "cs_1", customer: { id: "cus_X" } }));
    expect(d.stripeCustomerId).toBe("cus_X");
  });

  // Deve accogliere anche gli eventi che il provisioning ignora: sono proprio quelli che
  // oggi sparivano senza lasciare traccia.
  it("rimborso → importo da `amount`, nessuna sessione di checkout", () => {
    const d = datiPagamentoDaEvento(
      evt("charge.refunded", { id: "ch_1", payment_intent: "pi_7", amount: 500, currency: "eur" }),
    );
    expect(d).toMatchObject({ type: "charge.refunded", amountTotal: 500, paymentIntentId: "pi_7", checkoutSessionId: null });
  });

  it("evento con oggetto povero → nessun campo inventato, niente eccezioni", () => {
    const d = datiPagamentoDaEvento(evt("payment_intent.payment_failed", { id: "pi_5" }));
    expect(d.paymentIntentId).toBe("pi_5");
    expect(d.amountTotal).toBeNull();
    expect(d.organizationId).toBeNull();
    expect(d.currency).toBeNull();
  });

  it("livemode false (modalità test) viene registrato come tale", () => {
    const d = datiPagamentoDaEvento(evt("checkout.session.completed", { id: "cs_1" }, { livemode: false }));
    expect(d.livemode).toBe(false);
  });
});

describe("chiaveIdempotenza", () => {
  const T = 1_760_000_000_000; // istante fisso: la chiave dipende dall'ora

  it("stessi fattori nella stessa ora → stessa chiave (il retry riusa la sessione)", () => {
    expect(chiaveIdempotenza(["corso", "u1", "c1", 0], T)).toBe(
      chiaveIdempotenza(["corso", "u1", "c1", 0], T),
    );
  });

  // IL CASO CRITICO: se lo sconto cambia la chiave DEVE cambiare, altrimenti Stripe
  // riconsegnerebbe per 24h la sessione vecchia — cioè il PREZZO VECCHIO.
  it("sconto diverso → chiave diversa (niente prezzo stale)", () => {
    const a = chiaveIdempotenza(["corso", "u1", "c1", 0], T);
    const b = chiaveIdempotenza(["corso", "u1", "c1", 20], T);
    const c = chiaveIdempotenza(["corso", "u1", "c1", 30], T);
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("destinatario, corso e corso-a-scelta diversi → chiavi diverse", () => {
    const base = chiaveIdempotenza(["corso", "u1", "c1", 0], T);
    expect(chiaveIdempotenza(["corso", "u2", "c1", 0], T)).not.toBe(base);
    expect(chiaveIdempotenza(["corso", "u1", "c2", 0], T)).not.toBe(base);
    expect(chiaveIdempotenza(["pacchetto", "u1", "b1", "-"], T)).not.toBe(
      chiaveIdempotenza(["pacchetto", "u1", "b1", "scelto"], T),
    );
  });

  it("ora successiva → chiave diversa (una sessione abbandonata non resta incollata)", () => {
    expect(chiaveIdempotenza(["corso", "u1", "c1", 0], T)).not.toBe(
      chiaveIdempotenza(["corso", "u1", "c1", 0], T + 3_600_000),
    );
  });
});
