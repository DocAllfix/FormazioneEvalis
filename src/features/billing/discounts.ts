// Sconto azienda AUTOMATICO sui corsi singoli (deciso col cliente, 27/07):
// −20% dal 2° iscritto della stessa azienda allo stesso corso, −30% dal 5°.
// Si applica SOLO alle organizzazioni aziendali (mai alle org personali B2C) e SOLO
// ai corsi singoli (i bundle hanno già il loro prezzo pacchetto). L'applicazione è
// server-side al momento del checkout (coupon Stripe fissi, creati dal setup listino):
// il cliente trova lo sconto già applicato, nessun codice da digitare.

/** Coupon Stripe riutilizzabili con ID fisso (creati idempotenti da _setup-listino.ts). */
export const COMPANY_COUPONS = { 20: "azienda-20", 30: "azienda-30" } as const;

/** % di sconto azienda (PURA, testabile): 0 se org personale o primo iscritto;
 * 20 dal 2° iscritto (≥1 acquisto precedente del corso nell'org); 30 dal 5° (≥4). */
export function companyDiscountPercent(params: {
  isCompanyOrg: boolean;
  priorCoursePurchases: number; // enrollment b2c_purchase ATTIVE dell'org per QUEL corso
}): 0 | 20 | 30 {
  if (!params.isCompanyOrg || params.priorCoursePurchases < 1) return 0;
  return params.priorCoursePurchases >= 4 ? 30 : 20;
}
