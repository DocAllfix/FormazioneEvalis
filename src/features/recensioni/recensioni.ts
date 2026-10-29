// Recensioni dei corsi — scrittura dell'utente e moderazione dello staff.
//  - Scrive solo chi ha il CERTIFICATO del corso (provvisorio o accreditato, non revocato): ogni
//    opinione è di un partecipante che ha completato il corso. Una per iscrizione, modificabile.
//  - Il consenso alla pubblicazione è separato e revocabile; col consenso si salvano data e
//    versione del testo accettato, e il nome come comparirà sul sito.
//  - Ogni modifica del contenuto torna «da approvare»: sul sito va solo ciò che lo staff ha visto.
//  - La recensione non tocca mai il certificato né il tracciamento: è un dato a parte.
// Logica DB con userId esplicito (testabile); le server action passano quello della sessione.

import { and, desc, eq, ne, or, ilike } from "drizzle-orm";
import { certificate, course, courseReview, user } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { loadOwnedEnrollment } from "@/features/access/ownership";
import { requirePlatformAdmin } from "@/features/auth/guards";
import { renderEmail } from "@/lib/email/layout";
import { inviaEmailAssistenza } from "@/lib/email/resend";
import { ErroreUtente } from "@/lib/esito";
import {
  VERSIONE_CONSENSO,
  daApprovare,
  destinatariRecensioni,
  mailRecensioneDaApprovare,
  nomePubblico,
  validaRecensione,
  type FormaPubblicazione,
} from "./regole";

const baseUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type MiaRecensione = {
  votoCorso: number;
  votoPiattaforma: number | null;
  testo: string;
  pubblicazione: FormaPubblicazione;
  nomePubblico: string | null;
  stato: string;
};

const colonneMie = {
  enrollmentId: courseReview.enrollmentId,
  votoCorso: courseReview.votoCorso,
  votoPiattaforma: courseReview.votoPiattaforma,
  testo: courseReview.testo,
  pubblicazione: courseReview.pubblicazione,
  nomePubblico: courseReview.nomePubblico,
  stato: courseReview.stato,
};

/** Le recensioni dell'utente, per iscrizione (pagina Certificati, fine corso). */
export async function leggiMieRecensioni(userId: string): Promise<Map<string, MiaRecensione>> {
  const righe = await withTenant({ userId }, (tx) => tx.select(colonneMie).from(courseReview).where(eq(courseReview.userId, userId)));
  return new Map(righe.map(({ enrollmentId, ...r }) => [enrollmentId, { ...r, pubblicazione: r.pubblicazione as FormaPubblicazione }]));
}

/**
 * Salva (crea o modifica) la recensione dell'utente per una sua iscrizione. Rifiuta chi non ha
 * il certificato. Se il contenuto non cambia non fa nulla; se cambia ed è pubblicabile torna da
 * approvare e avvisa lo staff (best effort, dopo il salvataggio).
 */
export async function salvaRecensione(
  userId: string,
  enrollmentId: string,
  input: unknown,
): Promise<MiaRecensione & { avvisato: boolean }> {
  const d = validaRecensione(input);
  const enr = await loadOwnedEnrollment(enrollmentId, userId);

  const esito = await withTenant({ userId }, async (tx) => {
    const [cert] = await tx
      .select({ id: certificate.id })
      .from(certificate)
      .where(and(eq(certificate.enrollmentId, enrollmentId), ne(certificate.status, "revoked")))
      .limit(1);
    if (!cert) throw new ErroreUtente("Puoi lasciare la tua opinione dopo aver completato il corso.");

    const [u] = await tx.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
    const [c] = await tx.select({ title: course.title }).from(course).where(eq(course.id, enr.courseId)).limit(1);
    const [prima] = await tx.select().from(courseReview).where(eq(courseReview.enrollmentId, enrollmentId)).limit(1);

    const nome = nomePubblico(u?.name ?? "", d.pubblicazione);
    const uguale =
      prima &&
      prima.votoCorso === d.votoCorso &&
      prima.votoPiattaforma === d.votoPiattaforma &&
      prima.testo === d.testo &&
      prima.pubblicazione === d.pubblicazione &&
      prima.nomePubblico === nome;
    if (uguale) return { riga: prima, cambiata: false, nuova: false, u, corso: c?.title ?? "" };

    const ora = new Date();
    // il consenso si registra quando nasce o cambia forma; ritirato, si cancella
    const consenso =
      d.pubblicazione === "no"
        ? { consensoIl: null, consensoVersione: null }
        : prima && prima.pubblicazione === d.pubblicazione && prima.consensoIl
          ? { consensoIl: prima.consensoIl, consensoVersione: prima.consensoVersione }
          : { consensoIl: ora, consensoVersione: VERSIONE_CONSENSO };
    const valori = {
      votoCorso: d.votoCorso,
      votoPiattaforma: d.votoPiattaforma,
      testo: d.testo,
      pubblicazione: d.pubblicazione,
      nomePubblico: nome,
      ...consenso,
      stato: "da_approvare",
      moderataDa: null,
      moderataIl: null,
      updatedAt: ora,
    };
    const [riga] = prima
      ? await tx.update(courseReview).set(valori).where(eq(courseReview.id, prima.id)).returning()
      : await tx.insert(courseReview).values({ enrollmentId, userId, courseId: enr.courseId, ...valori }).returning();
    return { riga, cambiata: true, nuova: !prima, u, corso: c?.title ?? "" };
  });

  let avvisato = false;
  if (esito.cambiata && daApprovare(d)) {
    const staff = destinatariRecensioni();
    if (staff.length > 0) {
      const m = mailRecensioneDaApprovare(
        { ...d, autore: esito.u?.name ?? "", email: esito.u?.email ?? "", corso: esito.corso, nomePubblico: esito.riga.nomePubblico ?? "", modificata: !esito.nuova },
        baseUrl(),
      );
      avvisato = await inviaEmailAssistenza({ to: staff, subject: m.subject, html: renderEmail(m) })
        .then((r) => r.sent)
        .catch((e) => {
          console.error("[recensioni] mail allo staff non inviata", e instanceof Error ? e.message : e);
          return false;
        });
    } else {
      console.info(`[recensioni] (fuori produzione) mail allo staff NON inviata: recensione su ${esito.corso}`);
    }
  }
  const r = esito.riga;
  return {
    votoCorso: r.votoCorso,
    votoPiattaforma: r.votoPiattaforma,
    testo: r.testo,
    pubblicazione: r.pubblicazione as FormaPubblicazione,
    nomePubblico: r.nomePubblico,
    stato: r.stato,
    avvisato,
  };
}

/** C'è già una recensione per questa iscrizione? (mail dell'accreditato: chiedere o no). */
export async function haRecensione(enrollmentId: string): Promise<boolean> {
  const [r] = await withTenant({ platformAdmin: true }, (tx) =>
    tx.select({ id: courseReview.id }).from(courseReview).where(eq(courseReview.enrollmentId, enrollmentId)).limit(1),
  );
  return !!r;
}

// --- Staff ---

export type FiltroRecensioni = "da_approvare" | "approvate" | "in_evidenza" | "nascoste" | "private" | "tutte";
export const FILTRI_RECENSIONI: FiltroRecensioni[] = ["da_approvare", "approvate", "in_evidenza", "nascoste", "private", "tutte"];

const pubblicabile = and(ne(courseReview.pubblicazione, "no"), ne(courseReview.testo, ""));
const CONDIZIONE: Record<FiltroRecensioni, ReturnType<typeof and> | undefined> = {
  da_approvare: and(eq(courseReview.stato, "da_approvare"), pubblicabile),
  approvate: eq(courseReview.stato, "approvata"),
  in_evidenza: and(eq(courseReview.stato, "approvata"), eq(courseReview.inEvidenza, true)),
  nascoste: eq(courseReview.stato, "nascosta"),
  // senza consenso: le legge solo Evalis, non vanno mai sul sito
  private: eq(courseReview.pubblicazione, "no"),
  tutte: undefined,
};

/** Console staff: le recensioni, filtrate e cercabili per nome, email o corso. */
export async function listRecensioniStaff(filtro: { stato?: FiltroRecensioni; q?: string } = {}) {
  await requirePlatformAdmin();
  const q = filtro.q?.trim().slice(0, 100);
  const condizioni = [
    CONDIZIONE[filtro.stato ?? "da_approvare"],
    q ? or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`), ilike(course.title, `%${q}%`)) : undefined,
  ].filter(Boolean);
  return withTenant({ platformAdmin: true }, (tx) =>
    tx
      .select({
        id: courseReview.id,
        votoCorso: courseReview.votoCorso,
        votoPiattaforma: courseReview.votoPiattaforma,
        testo: courseReview.testo,
        pubblicazione: courseReview.pubblicazione,
        nomePubblico: courseReview.nomePubblico,
        consensoIl: courseReview.consensoIl,
        stato: courseReview.stato,
        inEvidenza: courseReview.inEvidenza,
        updatedAt: courseReview.updatedAt,
        autore: user.name,
        email: user.email,
        corso: course.title,
      })
      .from(courseReview)
      .innerJoin(user, eq(user.id, courseReview.userId))
      .innerJoin(course, eq(course.id, courseReview.courseId))
      .where(condizioni.length ? and(...condizioni) : undefined)
      .orderBy(desc(courseReview.updatedAt))
      .limit(200),
  );
}

export type AzioneModerazione = "approva" | "approva_evidenza" | "evidenza_si" | "evidenza_no" | "nascondi";
export const AZIONI_MODERAZIONE: AzioneModerazione[] = ["approva", "approva_evidenza", "evidenza_si", "evidenza_no", "nascondi"];

/**
 * Moderazione dello staff. «Nascondi» serve per insulti, dati personali o prove: toglie
 * l'opinione dal sito e il voto dalle medie. Le opinioni negative si approvano come le altre.
 */
export async function moderaRecensioneById(id: string, azione: AzioneModerazione, staffUserId: string) {
  if (!AZIONI_MODERAZIONE.includes(azione)) throw new ErroreUtente("Azione non valida.");
  return withTenant({ platformAdmin: true }, async (tx) => {
    const [r] = await tx.select().from(courseReview).where(eq(courseReview.id, id)).limit(1);
    if (!r) throw new ErroreUtente("Recensione non trovata.");
    const pubblicabileQui = r.pubblicazione !== "no" && r.testo !== "";
    if ((azione === "approva" || azione === "approva_evidenza" || azione === "evidenza_si") && !pubblicabileQui) {
      throw new ErroreUtente("Questa opinione non ha il consenso alla pubblicazione: resta solo per Evalis.");
    }
    if (azione === "evidenza_si" && r.stato !== "approvata") throw new ErroreUtente("Prima approva l'opinione.");
    const set =
      azione === "approva"
        ? { stato: "approvata" }
        : azione === "approva_evidenza"
          ? { stato: "approvata", inEvidenza: true }
          : azione === "evidenza_si"
            ? { inEvidenza: true }
            : azione === "evidenza_no"
              ? { inEvidenza: false }
              : { stato: "nascosta", inEvidenza: false };
    const [dopo] = await tx
      .update(courseReview)
      .set({ ...set, moderataDa: staffUserId, moderataIl: new Date() })
      .where(eq(courseReview.id, id))
      .returning({ id: courseReview.id, stato: courseReview.stato, inEvidenza: courseReview.inEvidenza });
    return dopo;
  });
}

/** Server Action: moderazione (solo staff piattaforma). */
export async function moderaRecensione(id: string, azione: AzioneModerazione) {
  const { user: staff } = await requirePlatformAdmin();
  return moderaRecensioneById(id, azione, staff.id);
}

