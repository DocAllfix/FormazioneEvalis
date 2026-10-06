// I MIEI ACQUISTI: i pagamenti fatti dall'utente, letti dal registro finanziario (payment_event),
// con il nome di ciò che ha comprato. La ricevuta non la conserviamo: la chiede a Stripe la rotta
// /api/ricevuta/[id] al momento del clic.
//
// ⚠️ SICUREZZA — questa condizione è l'UNICA barriera. La RLS su payment_event lascia leggere
// all'app ogni riga (policy app_rls_legge, migrazione 0029), quindi chi vede cosa lo decide
// `condizioneMio`, usata IDENTICA dall'elenco e dalla rotta della ricevuta. Un pagamento è "mio" se:
//   1. è un acquisto INCASSATO: checkout completato e pagato (o gratuito per un coupon al 100%),
//      oppure pagamento a conferma ritardata poi riuscito. Un checkout completato ma non ancora
//      incassato non è un acquisto (stessa regola di sessioneIncassata in events.ts);
//   2. è stato fatto per me: user_id = io (per un corso è il destinatario, per un pacchetto chi compra);
//   3. l'ho pagato io: sono owner o admin dell'organizzazione a cui è intestato il pagamento.
// Il punto 3 impedisce a un dipendente di vedere la ricevuta di un corso che l'AZIENDA ha pagato
// per lui: il documento di pagamento è dell'azienda, non suo.
// Limite voluto: l'admin che compra un corso PER un dipendente non lo trova qui (è intestato al
// dipendente); i pagamenti aziendali si gestiscono dal pannello di fatturazione dell'azienda.

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { bundle, course, paymentEvent } from "@/lib/db/schema";

const ACQUISTO = sql`(
  (${paymentEvent.type} = 'checkout.session.completed'
     and ${paymentEvent.payload}->'data'->'object'->>'payment_status' in ('paid', 'no_payment_required'))
  or ${paymentEvent.type} = 'checkout.session.async_payment_succeeded')`;
const RIMBORSO = "charge.refunded";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Acquisto = {
  id: string;
  quando: Date;
  cosa: string;
  tipo: "corso" | "pacchetto";
  importoCents: number | null;
  valuta: string | null;
  rimborsato: boolean;
};

function condizioneMio(userId: string) {
  return and(
    ACQUISTO,
    eq(paymentEvent.userId, userId),
    sql`exists (select 1 from "member" m
                where m.user_id = ${userId}
                  and m.organization_id = ${paymentEvent.organizationId}
                  and m.role in ('owner', 'admin'))`,
  );
}

/** Gli acquisti dell'utente, dal più recente. Per-utente: mai in una cache globale. */
export async function listMyPurchases(userId: string): Promise<Acquisto[]> {
  return withTenant({ userId }, async (tx) => {
    const righe = await tx
      .select({
        id: paymentEvent.id,
        quando: paymentEvent.occurredAt,
        importo: paymentEvent.amountTotal,
        valuta: paymentEvent.currency,
        intent: paymentEvent.paymentIntentId,
        meta: sql<Record<string, unknown> | null>`${paymentEvent.payload}->'data'->'object'->'metadata'`,
      })
      .from(paymentEvent)
      .where(condizioneMio(userId))
      .orderBy(desc(paymentEvent.occurredAt));
    if (righe.length === 0) return [];

    // nomi di ciò che è stato comprato: gli id vengono dai metadata del checkout (nostri), ma si
    // filtrano comunque come uuid, perché un valore diverso farebbe fallire tutta la query
    const idDi = (chiave: string) =>
      righe.map((r) => r.meta?.[chiave]).filter((v): v is string => typeof v === "string" && UUID.test(v));
    const corsiIds = idDi("courseId");
    const pacchettiIds = idDi("bundleId");
    const [corsi, pacchetti] = await Promise.all([
      corsiIds.length ? tx.select({ id: course.id, titolo: course.title }).from(course).where(inArray(course.id, corsiIds)) : [],
      pacchettiIds.length ? tx.select({ id: bundle.id, titolo: bundle.title }).from(bundle).where(inArray(bundle.id, pacchettiIds)) : [],
    ]);
    const titolo = new Map([...corsi, ...pacchetti].map((x) => [x.id, x.titolo]));

    // rimborsi: cercati SOLO fra i payment intent dei miei acquisti, mai altrove
    const intents = righe.map((r) => r.intent).filter((v): v is string => !!v);
    const rimborsati = new Set(
      intents.length
        ? (
            await tx
              .select({ intent: paymentEvent.paymentIntentId })
              .from(paymentEvent)
              .where(and(eq(paymentEvent.type, RIMBORSO), inArray(paymentEvent.paymentIntentId, intents)))
          ).map((r) => r.intent)
        : [],
    );

    return righe.map((r) => {
      const pacchetto = r.meta?.kind === "bundle_purchase";
      const rif = r.meta?.[pacchetto ? "bundleId" : "courseId"];
      return {
        id: r.id,
        quando: r.quando,
        cosa: (typeof rif === "string" && titolo.get(rif)) || (pacchetto ? "Pacchetto" : "Corso"),
        tipo: pacchetto ? "pacchetto" : "corso",
        importoCents: r.importo,
        valuta: r.valuta,
        rimborsato: !!r.intent && rimborsati.has(r.intent),
      };
    });
  });
}

/**
 * Il payment intent di un MIO acquisto, per chiedere la ricevuta a Stripe. `null` sia se il
 * pagamento non esiste sia se è di qualcun altro: chi chiede non deve poter distinguere i due casi.
 */
export async function paymentIntentDiMioAcquisto(userId: string, id: string): Promise<string | null> {
  if (!UUID.test(id)) return null;
  return withTenant({ userId }, async (tx) => {
    const [r] = await tx
      .select({ intent: paymentEvent.paymentIntentId })
      .from(paymentEvent)
      .where(and(eq(paymentEvent.id, id), condizioneMio(userId)))
      .limit(1);
    return r?.intent ?? null;
  });
}
