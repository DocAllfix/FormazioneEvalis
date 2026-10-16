// Azioni di checkout (avviate dall'utente). Ritornano un URL Stripe che la UI
// usa per il redirect. Protette dai guard esistenti. Nessuna logica di pagamento qui:
// il pagamento vive su Stripe, la verità di stato arriva dal webhook.

import type Stripe from "stripe";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { course, enrollment, member, organization } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe/client";
import { requireRole, requireSession } from "@/features/auth/guards";
import { parseOrgMetadata } from "@/features/auth/org-metadata";
import { spazioPersonale } from "@/features/auth/spazio-predefinito";
import { getCompanyAdminOrg } from "@/features/admin/context";
import { inVendita } from "@/features/catalog/vendibile";
import { ensureStripeCustomer } from "./customers";
import { loadBundleWithCourses, resolveBundleCourseIds } from "./bundles";
import { COMPANY_COUPONS, companyDiscountPercent } from "./discounts";
import { CORSI } from "./listino-dati";
import { chiaveIdempotenza } from "./idempotenza";
import { ErroreUtente } from "@/lib/esito";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// IVA (Stripe Tax): i Price sono tax-exclusive ("+ IVA"), Stripe calcola e aggiunge
// l'imposta al checkout. `customer_update` è OBBLIGATORIO col customer esistente:
// senza, i customer creati prima (senza indirizzo) fanno fallire sessions.create.
// Esportato: l'E2E (scripts/produzione/_e2e-listino.ts) riusa ESATTAMENTE questi parametri.
export const TAX_PARAMS = {
  automatic_tax: { enabled: true },
  billing_address_collection: "required",
  tax_id_collection: { enabled: true },
  customer_update: { address: "auto", name: "auto" },
} as const;

// Dati per la fattura elettronica che Stripe non chiede da solo. Arrivano nella sessione
// (`custom_fields`) e la notifica di vendita li riporta al committente (notifica-vendita.ts).
//  - Codice destinatario SDI o PEC: OBBLIGATORIO per tutti (scelta dell'utente, 05/10/2026), così
//    il committente ha sempre un recapito. Il privato che non ce l'ha, o non vuole la fattura,
//    scrive 0000000 (sette zeri: il codice SDI convenzionale "nessun codice"). Almeno 6
//    caratteri: una PEC o un codice SDI non sono mai più corti, e un "0" non passa.
//  - Codice fiscale: facoltativo, serve a chi vuole la fattura come privato.
// La spiegazione sta nell'etichetta (max 50 caratteri per Stripe) e sopra il pulsante Paga.
export const CAMPI_FATTURA: {
  custom_fields: Stripe.Checkout.SessionCreateParams.CustomField[];
  custom_text: Stripe.Checkout.SessionCreateParams.CustomText;
} = {
  custom_fields: [
    { key: "sdipec", label: { type: "custom", custom: "Codice SDI o PEC (privati: 0000000)" }, type: "text", optional: false, text: { minimum_length: 6, maximum_length: 100 } },
    { key: "codicefiscale", label: { type: "custom", custom: "Codice fiscale (solo se vuoi la fattura)" }, type: "text", optional: true, text: { maximum_length: 16 } },
  ],
  custom_text: {
    submit: {
      message:
        "Codice SDI o PEC: le aziende indicano il proprio codice destinatario o la PEC. I privati che non li hanno, o che non hanno bisogno della fattura, scrivono 0000000 (sette zeri). Il codice fiscale serve solo ai privati che vogliono la fattura.",
    },
  },
};
// Va nella chiave di idempotenza: per un'ora dopo il rilascio, chi aveva aperto il checkout
// prima riceverebbe da Stripe un errore (stessa chiave, parametri diversi). Se cambiano i
// campi, cambia questo valore.
const VERSIONE_CAMPI = "fatt3"; // fatt3: campo del codice promozionale (EVALIS70) nel checkout

/**
 * Il destinatario ha GIÀ questo corso? Guardia anti-doppio-addebito.
 *
 * Perché QUALSIASI stato e QUALSIASI origine, non solo le iscrizioni attive: il vincolo di
 * unicità è su `(user_id, course_id)` e il webhook inserisce con `onConflictDoNothing` su
 * quella coppia. Se una riga esiste — anche revocata, anche arrivata da un posto azienda —
 * un nuovo acquisto NON produce alcuna iscrizione: Stripe incasserebbe e l'utente non
 * riceverebbe nulla. Meglio rifiutare prima di toccare Stripe.
 */
export async function haGiaIlCorso(userId: string, courseId: string): Promise<boolean> {
  const [e] = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)))
    .limit(1);
  return Boolean(e);
}

/** % sconto azienda per l'acquisto di un corso da parte dell'org attiva (0 | 20 | 30 | 40). */
export async function courseCompanyDiscountPercent(orgId: string, courseId: string): Promise<0 | 20 | 30 | 40> {
  const [org] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  const isCompanyOrg = parseOrgMetadata(org?.metadata)?.type === "company";
  if (!isCompanyOrg) return 0; // org personale B2C: mai sconto azienda (query sotto evitata)
  const [prior] = await db
    .select({ n: count() })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.organizationId, orgId),
        eq(enrollment.courseId, courseId),
        eq(enrollment.source, "b2c_purchase"),
        eq(enrollment.status, "active"),
      ),
    );
  // sconto proprio del corso, se il listino ne ha uno (corsi privacy); altrimenti la regola generale
  const [crs] = await db.select({ slug: course.slug }).from(course).where(eq(course.id, courseId)).limit(1);
  const scontoFisso = CORSI.find((x) => x.slug === crs?.slug)?.scontoAzienda;
  return companyDiscountPercent({ isCompanyOrg, priorCoursePurchases: prior?.n ?? 0, scontoFisso });
}

/**
 * A nome di chi si compra. NON dipende dallo spazio della sessione:
 *  - titolare o amministratore di un'azienda → l'azienda (suo cliente Stripe, sconto aziendale);
 *  - chiunque altro, compreso il dipendente semplice e l'ex dipendente → il proprio spazio
 *    personale: cliente Stripe suo, prezzo pieno. Così i dati di fatturazione dell'azienda non
 *    possono essere sovrascritti da un dipendente e lo sconto resta a chi compra per l'azienda.
 */
export async function spazioAcquisti(userId: string): Promise<string> {
  return (await getCompanyAdminOrg(userId))?.id ?? (await spazioPersonale(userId));
}

/** B2C: acquisto one-off di un corso → enrollment (via webhook).
 * Sconto azienda applicato AUTOMATICAMENTE (−20% dal 2° iscritto, −30% dal 5°).
 * `beneficiaryUserId`: l'azienda può comprare PER un proprio dipendente (l'iscrizione va
 * a lui). Consentito solo a owner/admin dell'org e solo verso membri della stessa org. */
export async function createCoursePurchaseCheckout(courseId: string, beneficiaryUserId?: string): Promise<string> {
  const { user } = await requireSession();
  const [c] = await db
    .select({ stripePriceId: course.stripePriceId, status: course.status, organizationId: course.organizationId })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);
  if (!c) throw new Error("Corso inesistente.");
  if (!inVendita(c)) throw new ErroreUtente("Questo corso non è disponibile per l'acquisto.");
  if (!c.stripePriceId) throw new Error("Corso non acquistabile singolarmente (prezzo non configurato).");

  // acquisto per un dipendente: serve essere titolare/amministratore dell'azienda e che il
  // destinatario ne sia membro
  let destinatarioId = user.id;
  let orgId: string;
  if (beneficiaryUserId && beneficiaryUserId !== user.id) {
    const azienda = await getCompanyAdminOrg(user.id);
    if (!azienda) throw new ErroreUtente("Solo il titolare o un amministratore dell'azienda può acquistare per un dipendente.");
    orgId = azienda.id;
    const [m] = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.userId, beneficiaryUserId), eq(member.organizationId, orgId)))
      .limit(1);
    if (!m) throw new ErroreUtente("Il destinatario non è un membro della tua organizzazione.");
    destinatarioId = beneficiaryUserId;
  } else {
    orgId = await spazioAcquisti(user.id);
  }

  // GUARDIA anti-doppio-addebito: si controlla il DESTINATARIO (non chi paga) e si esce PRIMA
  // di creare la sessione Stripe. Senza, chi possiede già il corso poteva pagarlo una seconda
  // volta e non ricevere nulla (il webhook non crea l'iscrizione: esiste già).
  if (await haGiaIlCorso(destinatarioId, courseId)) {
    throw new ErroreUtente(
      destinatarioId === user.id
        ? "Hai già questo corso: lo trovi tra i tuoi percorsi."
        : "Questa persona ha già accesso al corso.",
    );
  }

  const percent = await courseCompanyDiscountPercent(orgId, courseId);
  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: c.stripePriceId, quantity: 1 }],
    // `discounts` è mutuamente esclusivo con allow_promotion_codes: con lo sconto azienda
    // automatico il campo del codice non compare; senza, il cliente può inserire un codice
    // promozionale (EVALIS70, riservato allo staff Evalis: _codice-evalis70.ts)
    ...(percent !== 0 ? { discounts: [{ coupon: COMPANY_COUPONS[percent] }] } : { allow_promotion_codes: true }),
    ...TAX_PARAMS,
    ...CAMPI_FATTURA,
    // userId = destinatario dell'iscrizione (se stesso, o il dipendente per cui si compra)
    metadata: { kind: "course_purchase", userId: destinatarioId, courseId, orgId },
    success_url: `${appUrl()}${destinatarioId === user.id ? "/dashboard?purchase=success" : "/admin/persone?purchase=success"}`,
    cancel_url: `${appUrl()}${destinatarioId === user.id ? "/dashboard?purchase=cancel" : "/admin/persone?purchase=cancel"}`,
  }, {
    // include lo SCONTO: senza, un cambio di percentuale restituirebbe la sessione vecchia
    idempotencyKey: chiaveIdempotenza(["corso", destinatarioId, courseId, percent, VERSIONE_CAMPI]),
  });
  if (!session.url) throw new Error("URL checkout non disponibile.");
  return session.url;
}

/** B2C: acquisto one-off di un PACCHETTO → N enrollment (via webhook). Il prezzo è quello
 * del bundle (un solo line_item); per i pick_one `chosenCourseId` è il corso a scelta,
 * validato qui (fail-fast) e riverificato dal provisioning. Nessuno sconto azienda. */
export async function createBundlePurchaseCheckout(bundleId: string, chosenCourseId?: string): Promise<string> {
  const { user } = await requireSession();
  const orgId = await spazioAcquisti(user.id);
  const { bundle: b, links } = await loadBundleWithCourses(bundleId);
  if (!b.active) throw new ErroreUtente("Pacchetto non disponibile.");
  if (!b.stripePriceId) throw new Error("Pacchetto non acquistabile (prezzo non configurato).");
  const courseIds = resolveBundleCourseIds(b, links, chosenCourseId); // valida la composizione prima di toccare Stripe

  // Tutti i corsi che il pacchetto consegnerebbe devono essere in vendita: se uno è stato
  // ritirato il pacchetto non si vende (nessuno paga per un corso che non può ricevere). Il
  // controllo sta SOLO qui: la consegna dopo il pagamento non rifiuta mai.
  const stati = await db
    .select({ status: course.status, organizationId: course.organizationId })
    .from(course)
    .where(inArray(course.id, courseIds));
  if (stati.length !== courseIds.length || !stati.every(inVendita)) {
    throw new ErroreUtente("Pacchetto non disponibile: uno dei corsi non è più in vendita.");
  }

  // GUARDIA anti-doppio-addebito, versione pacchetto: si rifiuta SOLO se l'utente possiede già
  // TUTTI i corsi inclusi (in quel caso pagherebbe per zero iscrizioni nuove). Se gliene manca
  // anche uno solo l'acquisto è legittimo e prosegue: il provisioning gli darà i mancanti.
  const [gia] = await db
    .select({ n: count() })
    .from(enrollment)
    .where(and(eq(enrollment.userId, user.id), inArray(enrollment.courseId, courseIds)));
  if ((gia?.n ?? 0) >= courseIds.length) {
    throw new ErroreUtente("Hai già tutti i corsi di questo pacchetto: li trovi tra i tuoi percorsi.");
  }

  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: b.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true, // codice promozionale (EVALIS70): i pacchetti non hanno sconto automatico
    ...TAX_PARAMS,
    ...CAMPI_FATTURA,
    metadata: {
      kind: "bundle_purchase",
      userId: user.id,
      bundleId,
      ...(chosenCourseId ? { chosenCourseId } : {}),
      orgId,
    },
    success_url: `${appUrl()}/dashboard?purchase=success`,
    cancel_url: `${appUrl()}/dashboard?purchase=cancel`,
  }, {
    // il corso a scelta cambia la composizione del pacchetto → deve entrare nella chiave
    idempotencyKey: chiaveIdempotenza(["pacchetto", user.id, bundleId, chosenCourseId ?? "-", VERSIONE_CAMPI]),
  });
  if (!session.url) throw new Error("URL checkout non disponibile.");
  return session.url;
}

// NB: qui c'era `createSeatSubscriptionCheckout`, un abbonamento mensile per posto nato col
// modulo 2. Il modello commerciale e' poi diventato un altro — corsi e pacchetti a prezzo
// pieno con i coupon azienda (-20% dal 2° iscritto, -30% dal 5°), che e' quello in vendita —
// e quella funzione e' rimasta irraggiungibile per mesi, puntata a un prezzo del vecchio
// account di prova che sul live non esiste nemmeno.
//
// Rimossa il 06/08/2026. Non perche' desse fastidio, ma perche' SEMBRAVA pronta: e' il tipo
// di codice che qualcuno ricollega tra sei mesi credendo sia la strada per il B2B, e ci si
// ritrova con due modelli di vendita in piedi contemporaneamente.

/** B2B: Customer Portal Stripe — l'azienda vede fatture e metodi di pagamento. */
export async function createBillingPortalSession(): Promise<string> {
  const { orgId } = await requireRole("owner", "admin");
  const customerId = await ensureStripeCustomer(orgId);
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/admin/billing`,
  });
  return session.url;
}
