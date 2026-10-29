// Recensioni dei corsi sul DB: scrive solo chi ha il certificato, una per iscrizione; sul sito va
// solo ciò che ha il consenso ED è approvato; ritirato il consenso o modificata, sparisce dal sito;
// media su tutti i voti non nascosti e solo da 3 voti; mail allo staff solo dalla produzione e
// solo per ciò che va approvato. Anche con RLS_FORCE_ROLE=app_rls: nessuno legge le altrui.

import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";

type Inviata = { to: string[]; subject: string; html: string };
const inviate = vi.hoisted(() => [] as Inviata[]);
vi.mock("@/lib/email/resend", async (orig) => ({
  ...(await orig<typeof import("@/lib/email/resend")>()),
  inviaEmailAssistenza: vi.fn(async (m: Inviata) => {
    inviate.push(m); // le mail si contano, non si inviano
    return { sent: true };
  }),
}));

import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { user, organization, member, course, enrollment, certificate, courseReview } from "@/lib/db/schema";
import { serializeOrgMetadata } from "@/features/auth/org-metadata";
import { ingestCourse } from "@/features/courses/ingest";
import { sampleCourse } from "@/features/courses/seed";
import { salvaRecensione, leggiMieRecensioni, moderaRecensioneById, haRecensione } from "@/features/recensioni/recensioni";
import { _opinioniPubbliche, _mediaRecensioni } from "@/features/recensioni/pubbliche";

const RUN = Date.now();
const ORG = `recens-org-${RUN}`;
const utenti: string[] = [];
let courseId = "";
const STAFF = `recens-staff-${RUN}`;

async function corsista(tag: string, conCertificato: boolean, stato: "ready_for_review" | "revoked" = "ready_for_review") {
  const id = `recens-${tag}-${RUN}`;
  utenti.push(id);
  const ora = new Date();
  await db.insert(user).values({ id, name: `mario rossi${tag}`, email: `${id}@example.test`, emailVerified: true, createdAt: ora, updatedAt: ora });
  await db.insert(member).values({ id: `m-${id}`, organizationId: ORG, userId: id, role: "member", createdAt: ora });
  const [e] = await db.insert(enrollment).values({ organizationId: ORG, userId: id, courseId, source: "manual", status: "active" }).returning({ id: enrollment.id });
  if (conCertificato) await db.insert(certificate).values({ enrollmentId: e.id, status: stato, number: `REC-${tag}-${RUN}` });
  return { id, enrollmentId: e.id };
}

const rifiuto = async (p: Promise<unknown>) => p.then(() => null, (e: Error) => e.message);
const pubbliche = () => _opinioniPubbliche({ corsoId: courseId, limite: 50 });
const riga = async (enrollmentId: string) => (await db.select().from(courseReview).where(eq(courseReview.enrollmentId, enrollmentId)))[0];

beforeAll(async () => {
  await db.insert(organization).values({ id: ORG, name: ORG, slug: ORG, createdAt: new Date(), metadata: serializeOrgMetadata({ type: "company", seatLimit: 50 }) });
  ({ courseId } = await ingestCourse({ ...sampleCourse(), title: `Corso recensioni ${RUN}` }));
  await db.update(course).set({ status: "published" }).where(eq(course.id, courseId));
});

afterAll(async () => {
  delete process.env.VERCEL_ENV;
  if (utenti.length) await db.delete(enrollment).where(inArray(enrollment.userId, utenti)); // cascade certificato e recensione
  if (courseId) await db.delete(course).where(eq(course.id, courseId));
  await db.delete(organization).where(eq(organization.id, ORG));
  if (utenti.length) await db.delete(user).where(inArray(user.id, utenti));
});

describe("recensioni dei corsi", () => {
  it("senza certificato (o con certificato revocato) l'opinione è rifiutata; iscrizione altrui rifiutata", async () => {
    const senza = await corsista("senza", false);
    expect(await rifiuto(salvaRecensione(senza.id, senza.enrollmentId, { votoCorso: 5 }))).toMatch(/completato il corso/);
    const revocato = await corsista("revocato", true, "revoked");
    expect(await rifiuto(salvaRecensione(revocato.id, revocato.enrollmentId, { votoCorso: 5 }))).toMatch(/completato il corso/);
    const altro = await corsista("altro", true);
    expect(await rifiuto(salvaRecensione(senza.id, altro.enrollmentId, { votoCorso: 1 }))).toBeTruthy();
    expect(await haRecensione(altro.enrollmentId)).toBe(false);
  });

  it("consenso → da approvare → approvata: sul sito col nome scelto; una sola per iscrizione", async () => {
    inviate.length = 0;
    const a = await corsista("a", true);
    const salvata = await salvaRecensione(a.id, a.enrollmentId, { votoCorso: 5, votoPiattaforma: 4, testo: "Molto utile", pubblicazione: "nome_iniziale" });
    expect(salvata).toMatchObject({ stato: "da_approvare", nomePubblico: "Mario R.", avvisato: false });
    expect(inviate).toHaveLength(0); // fuori produzione nessuna mail
    const r = await riga(a.enrollmentId);
    expect(r.consensoIl).toBeInstanceOf(Date);
    expect(r.consensoVersione).toBe(1);
    expect(await pubbliche()).toHaveLength(0); // non ancora approvata

    await moderaRecensioneById(r.id, "approva_evidenza", STAFF);
    const sito = await pubbliche();
    expect(sito).toHaveLength(1);
    expect(sito[0]).toMatchObject({ nome: "Mario R.", votoCorso: 5, votoPiattaforma: 4, testo: "Molto utile" });
    expect(JSON.stringify(sito)).not.toContain("@example.test");
    expect((await _opinioniPubbliche({ corsoId: courseId, soloEvidenza: true })).map((o) => o.id)).toEqual([r.id]);

    // salvare di nuovo lo stesso contenuto non cambia nulla; un secondo salvataggio non crea una seconda riga
    await salvaRecensione(a.id, a.enrollmentId, { votoCorso: 5, votoPiattaforma: 4, testo: "Molto utile", pubblicazione: "nome_iniziale" });
    expect((await riga(a.enrollmentId)).stato).toBe("approvata");
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(courseReview).where(eq(courseReview.enrollmentId, a.enrollmentId));
    expect(n).toBe(1);
  });

  it("modificata torna da approvare e sparisce dal sito; consenso ritirato → mai sul sito, nemmeno approvata", async () => {
    const b = await corsista("b", true);
    await salvaRecensione(b.id, b.enrollmentId, { votoCorso: 4, testo: "Bene", pubblicazione: "nome_cognome" });
    const id = (await riga(b.enrollmentId)).id;
    await moderaRecensioneById(id, "approva", STAFF);
    expect((await pubbliche()).some((o) => o.id === id && o.nome === "Mario Rossib")).toBe(true);

    await salvaRecensione(b.id, b.enrollmentId, { votoCorso: 4, testo: "Bene, ma lungo", pubblicazione: "nome_cognome" });
    expect((await riga(b.enrollmentId)).stato).toBe("da_approvare");
    expect((await pubbliche()).some((o) => o.id === id)).toBe(false);

    await salvaRecensione(b.id, b.enrollmentId, { votoCorso: 4, testo: "Bene, ma lungo", pubblicazione: "no" });
    const ritirata = await riga(b.enrollmentId);
    expect(ritirata).toMatchObject({ pubblicazione: "no", nomePubblico: null, consensoIl: null });
    expect(await rifiuto(moderaRecensioneById(id, "approva", STAFF))).toMatch(/consenso/);
    // anche forzando lo stato a mano, la lettura pubblica non la mostra
    await db.update(courseReview).set({ stato: "approvata" }).where(eq(courseReview.id, id));
    expect((await pubbliche()).some((o) => o.id === id)).toBe(false);
  });

  it("media: su tutti i voti non nascosti, solo da 3 voti in su; nascondere toglie dal sito e dalla media", async () => {
    // fin qui: a=5 (approvata), b=4 (senza consenso) → 2 voti, sotto la soglia
    expect(await _mediaRecensioni(courseId)).toBeNull();
    const c = await corsista("c", true);
    await salvaRecensione(c.id, c.enrollmentId, { votoCorso: 1, votoPiattaforma: 2, testo: "", pubblicazione: "no" });
    expect(await _mediaRecensioni(courseId)).toEqual({ numero: 3, media: 3.33 }); // anche il voto negativo senza consenso conta

    const idA = (await pubbliche()).find((o) => o.votoCorso === 5)!.id;
    await moderaRecensioneById(idA, "nascondi", STAFF);
    expect((await pubbliche()).some((o) => o.id === idA)).toBe(false);
    expect(await _mediaRecensioni(courseId)).toBeNull(); // 2 voti non nascosti
  });

  it("mail allo staff: dalla produzione, solo a dilonardoa28, solo se c'è da approvare", async () => {
    process.env.VERCEL_ENV = "production";
    try {
      inviate.length = 0;
      const d = await corsista("d", true);
      await salvaRecensione(d.id, d.enrollmentId, { votoCorso: 3, testo: "", pubblicazione: "no" });
      expect(inviate).toHaveLength(0); // senza consenso non c'è nulla da approvare
      const r = await salvaRecensione(d.id, d.enrollmentId, { votoCorso: 3, testo: "Discreto", pubblicazione: "nome_iniziale" });
      expect(r.avvisato).toBe(true);
      expect(inviate).toHaveLength(1);
      expect(inviate[0].to).toEqual(["dilonardoa28@gmail.com"]);
      expect(inviate[0].subject).toContain("da approvare");
      await salvaRecensione(d.id, d.enrollmentId, { votoCorso: 3, testo: "Discreto", pubblicazione: "nome_iniziale" });
      expect(inviate).toHaveLength(1); // nessuna modifica, nessuna mail
    } finally {
      delete process.env.VERCEL_ENV;
    }
  });

  it("ognuno legge solo le proprie; la lettura pubblica passa solo dalle funzioni", async () => {
    const e = await corsista("e", true);
    await salvaRecensione(e.id, e.enrollmentId, { votoCorso: 2, testo: "Privata", pubblicazione: "no" });
    const mie = await leggiMieRecensioni(e.id);
    expect([...mie.keys()]).toEqual([e.enrollmentId]);
    expect(mie.get(e.enrollmentId)).toMatchObject({ votoCorso: 2, testo: "Privata" });

    // nella transazione di un altro utente (sotto app_rls con RLS_FORCE_ROLE) la riga non si vede
    const viste = await withTenant({ userId: utenti[0] }, (tx) =>
      tx.select({ id: courseReview.id }).from(courseReview).where(eq(courseReview.enrollmentId, e.enrollmentId)),
    );
    if (process.env.RLS_FORCE_ROLE) expect(viste).toHaveLength(0);
    // le funzioni pubbliche rispondono anche dal ruolo dell'app, senza nessun contesto
    const viaApp = await withTenant({}, (tx) => tx.execute(sql`SELECT numero FROM media_recensioni(${courseId}::uuid)`));
    expect(viaApp).toHaveLength(1);
  });
});
