// Dati anagrafici per il certificato accreditato: codice fiscale, data e luogo di nascita.
// Si chiedono PRIMA dell'esame finale (l'avvio dell'esame li esige lato server, vedi
// features/learner/actions.ts), così a fine corso il committente li riceve già nella mail.
// Bloccati quando esiste un certificato: ciò che il committente ha ricevuto non deve cambiare
// alle sue spalle; per correggerli si passa dall'assistenza.

import { eq, sql } from "drizzle-orm";
import { anagraficaCertificato, certificate, enrollment } from "@/lib/db/schema";
import { withTenant, type TenantCtx } from "@/lib/db/tenant";

export type Anagrafica = { codiceFiscale: string; dataNascita: string; luogoNascita: string };

const DISPARI: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};
const pari = (c: string) => (c >= "0" && c <= "9" ? c.charCodeAt(0) - 48 : c.charCodeAt(0) - 65);
// formato ufficiale, comprese le lettere di omocodia al posto delle cifre
const FORMATO_CF = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

/** Codice fiscale italiano valido: formato e carattere di controllo. */
export function codiceFiscaleValido(cf: string): boolean {
  if (!FORMATO_CF.test(cf)) return false;
  let somma = 0;
  for (let i = 0; i < 15; i++) somma += i % 2 === 0 ? DISPARI[cf[i]] : pari(cf[i]);
  return String.fromCharCode(65 + (somma % 26)) === cf[15];
}

/** Controlla e normalizza quanto scritto dall'utente. Funzione PURA. */
export function validaAnagrafica(
  input: { codiceFiscale?: unknown; dataNascita?: unknown; luogoNascita?: unknown },
  oggi = new Date(),
): { ok: true; dati: Anagrafica } | { ok: false; errore: string } {
  const cf = String(input.codiceFiscale ?? "").replace(/\s+/g, "").toUpperCase();
  if (!codiceFiscaleValido(cf)) return { ok: false, errore: "Il codice fiscale non è valido: controlla di averlo scritto bene." };

  const data = String(input.dataNascita ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!m || !d || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    return { ok: false, errore: "La data di nascita non è valida." };
  }
  const anni = oggi.getUTCFullYear() - d.getUTCFullYear() - (oggi < new Date(Date.UTC(oggi.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) ? 1 : 0);
  if (+m[1] < 1900 || anni < 14) return { ok: false, errore: "La data di nascita non è valida." };

  const luogo = String(input.luogoNascita ?? "").replace(/\s+/g, " ").trim();
  if (luogo.length < 2 || luogo.length > 80) return { ok: false, errore: "Indica il luogo di nascita (comune e, se all'estero, lo Stato)." };

  return { ok: true, dati: { codiceFiscale: cf, dataNascita: data, luogoNascita: luogo } };
}

/** "12 marzo 1980": per PDF e mail. */
export function dataNascitaLeggibile(iso: string): string {
  const [a, m, g] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, g)).toLocaleDateString("it-IT", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
}

export async function leggiAnagrafica(userId: string, ctx: TenantCtx = { userId }): Promise<Anagrafica | null> {
  return withTenant(ctx, async (tx) => {
    const [r] = await tx
      .select({
        codiceFiscale: anagraficaCertificato.codiceFiscale,
        dataNascita: anagraficaCertificato.dataNascita,
        luogoNascita: anagraficaCertificato.luogoNascita,
      })
      .from(anagraficaCertificato)
      .where(eq(anagraficaCertificato.userId, userId))
      .limit(1);
    return r ?? null;
  });
}

/** I dati sono bloccati se l'utente ha già un certificato (qualunque stato). */
export async function anagraficaBloccata(userId: string, ctx: TenantCtx = { userId }): Promise<boolean> {
  return withTenant(ctx, async (tx) => {
    const [r] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(certificate)
      .innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
      .where(eq(enrollment.userId, userId));
    return (r?.n ?? 0) > 0;
  });
}

/** Salva (o aggiorna) i dati dell'utente. Rifiuta dati non validi o già usati per un certificato. */
export async function salvaAnagrafica(
  userId: string,
  input: { codiceFiscale?: unknown; dataNascita?: unknown; luogoNascita?: unknown },
): Promise<Anagrafica> {
  const v = validaAnagrafica(input);
  if (!v.ok) throw new Error(v.errore);
  if (await anagraficaBloccata(userId)) {
    throw new Error("Questi dati sono già stati usati per il tuo certificato: per correggerli scrivi all'assistenza.");
  }
  await withTenant({ userId }, async (tx) => {
    await tx
      .insert(anagraficaCertificato)
      .values({ userId, ...v.dati })
      .onConflictDoUpdate({ target: anagraficaCertificato.userId, set: { ...v.dati, updatedAt: new Date() } });
  });
  return v.dati;
}
