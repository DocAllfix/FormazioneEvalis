// Tracciamento server-authoritative per-unità (slide). Il SERVER ricalcola i secondi
// effettivi dagli heartbeat: accredita un intervallo solo se play + focus + avanzamento
// coerente (posizione ≈ tempo reale). Ignora salti avanti/indietro, pause, AFK, gap.
// La verità è qui, non nel client. Requisito Accordo: tracciabilità per-unità.

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slide, slideProgress, lesson, module as courseModule } from "@/lib/db/schema";
import { heartbeat } from "@/lib/db/schema";
import { appendActivity, auditContextFromEnrollment } from "@/features/audit/log";
import { withTenant, type TenantCtx } from "@/lib/db/tenant";

// Executor: db globale OPPURE una transazione (per ereditare le GUC di tenant da withTenant).
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const CREDIT_TOLERANCE_SECONDS = 3; // scarto ammesso tra tempo reale e avanzamento posizione
export const MAX_GAP_MS = 30_000; // oltre questo, l'intervallo non viene accreditato
// Tempo minimo di fruizione (vincolo Accordo Stato-Regioni): la slide si completa solo
// se la clip è stata vista fino in fondo (audioCompleted, no-seek) E il tempo EFFETTIVO
// accreditato lato server copre ≥ 95% della durata. L'accredito è sempre wall-time reale
// (non la posizione dichiarata): impossibile da falsificare istantaneamente.
export const MIN_WATCH_RATIO = 0.95;

/** Quanti secondi accreditare tra due heartbeat consecutivi (LOGICA PURA, testabile).
 * Accredita il CONTENUTO del video effettivamente scorso (avanzamento posizione), MAI più
 * del tempo reale trascorso. Regole (anti-frode E anti-stallo, la seconda è prioritaria: un
 * utente che guarda davvero non deve MAI restare bloccato):
 *  - basta il focus a UN estremo dell'intervallo: col video messo in pausa a scheda nascosta
 *    la posizione avanza SOLO mentre guardi, quindi un avanzamento è visione reale anche a
 *    cavallo di un cambio scheda; se il focus manca a ENTRAMBI gli estremi → niente credito;
 *  - in play (o intervallo finale a clip conclusa);
 *  - niente gap/AFK oltre maxGap;
 *  - pos ≤ 0 (fermo/buffering/salto indietro) → 0: nessun contenuto nuovo (il buffering non
 *    fa danno, semplicemente non accredita finché il video non riparte);
 *  - credito = min(avanzamento, tempo reale): non si può consumare più video dei secondi
 *    realmente passati (blocca la velocità x2); i salti in avanti sono già impediti dallo
 *    snap-back client e comunque qui verrebbero limitati al tempo reale. */
export function creditableSeconds(p: {
  prevTsMs: number | null;
  prevFocus: boolean | null;
  prevPosition: number | null;
  nowMs: number;
  position: number;
  focus: boolean;
  playing: boolean;
  audioCompleted?: boolean;
  maxGapMs?: number;
}): number {
  if (p.prevTsMs === null || p.prevPosition === null) return 0; // primo heartbeat
  if (!p.focus && !p.prevFocus) return 0; // scheda nascosta a entrambi gli estremi
  if (!p.playing && !p.audioCompleted) return 0; // in play, o intervallo finale a clip conclusa
  const wall = (p.nowMs - p.prevTsMs) / 1000;
  const pos = p.position - p.prevPosition;
  if (wall <= 0 || p.nowMs - p.prevTsMs > (p.maxGapMs ?? MAX_GAP_MS)) return 0; // gap/AFK
  if (pos <= 0) return 0; // fermo, buffering o salto indietro: nessun contenuto nuovo
  if (pos > wall + CREDIT_TOLERANCE_SECONDS) return 0; // salto in avanti / velocità x2: non credito
  return Math.min(Math.round(pos), Math.round(wall)); // contenuto scorso, cap sul tempo reale
}

export async function recordHeartbeat(params: {
  enrollmentId: string;
  slideId: string;
  position: number;
  focus: boolean;
  playing: boolean;
  audioCompleted?: boolean;
  nowMs?: number; // iniettabile per i test; default = ora
  ctx?: TenantCtx; // identità tenant (dal route: { userId }); assente nei test → bypass
}) {
  const { enrollmentId, slideId, position, focus, playing } = params;
  const nowMs = params.nowMs ?? Date.now();
  const now = new Date(nowMs);

  // L'INTERO heartbeat gira in un'unica transazione sotto le GUC di tenant: la lettura
  // dell'esistente, il ping grezzo e la transizione a completata (progress + audit) sono
  // atomici. La contabilità server-authoritative dei secondi resta identica.
  return withTenant(params.ctx ?? {}, async (tx) => {
    const [sl] = await tx
      .select({ audioSeconds: slide.audioSeconds, lessonId: slide.lessonId })
      .from(slide)
      .where(eq(slide.id, slideId))
      .limit(1);
    if (!sl) throw new Error("Slide inesistente.");

    const [prev] = await tx
      .select({ ts: heartbeat.ts, position: heartbeat.position, focus: heartbeat.focus })
      .from(heartbeat)
      .where(and(eq(heartbeat.enrollmentId, enrollmentId), eq(heartbeat.slideId, slideId)))
      .orderBy(desc(heartbeat.ts))
      .limit(1);

    const credit = creditableSeconds({
      prevTsMs: prev ? prev.ts.getTime() : null,
      prevFocus: prev ? prev.focus : null,
      prevPosition: prev ? prev.position : null,
      nowMs,
      position,
      focus,
      playing,
      audioCompleted: params.audioCompleted,
    });

    // audit grezzo del ping
    await tx.insert(heartbeat).values({ enrollmentId, lessonId: sl.lessonId, slideId, position, focus, ts: now });

    const [existing] = await tx
      .select()
      .from(slideProgress)
      .where(and(eq(slideProgress.enrollmentId, enrollmentId), eq(slideProgress.slideId, slideId)))
      .limit(1);

    const audioCompleted = (existing?.audioCompleted ?? false) || (params.audioCompleted ?? false);
    const effectiveSeconds = (existing?.effectiveSeconds ?? 0) + credit;
    // Completa quando la clip è stata vista FINO IN FONDO (audioCompleted: il gate
    // impedisce di saltare avanti) E il tempo EFFETTIVO accreditato copre ≥ MIN_WATCH_RATIO
    // della durata. L'accredito dell'ultimo intervallo (vedi creditableSeconds) porta una
    // visione onesta vicino al 100%, lasciando margine sopra la soglia; un completamento
    // istantaneo avrebbe 0s effettivi e resta bloccato.
    const requiredSeconds = Math.max(3, Math.floor(sl.audioSeconds * MIN_WATCH_RATIO));
    const completed = audioCompleted && effectiveSeconds >= requiredSeconds;
    const completedAt = completed ? existing?.completedAt ?? now : existing?.completedAt ?? null;
    const justCompleted = completed && !existing?.completedAt;
    const setValues = { effectiveSeconds, audioCompleted, completedAt, updatedAt: now };

    if (justCompleted) {
      // transizione a completata: progress + evento audit (già nell'unica tx → atomici)
      if (existing) {
        await tx.update(slideProgress).set(setValues).where(eq(slideProgress.id, existing.id));
      } else {
        await tx.insert(slideProgress).values({ enrollmentId, slideId, ...setValues });
      }
      const { organizationId, userId } = await auditContextFromEnrollment(tx, enrollmentId);
      await appendActivity(tx, {
        organizationId,
        userId,
        verb: "completed",
        object: `slide:${slideId}`,
        payload: { effectiveSeconds, audioSeconds: sl.audioSeconds },
      });
    } else if (existing) {
      await tx.update(slideProgress).set(setValues).where(eq(slideProgress.id, existing.id));
    } else {
      await tx.insert(slideProgress).values({ enrollmentId, slideId, ...setValues });
    }

    return { effectiveSeconds, audioCompleted, completed };
  });
}

export async function isSlideCompleted(enrollmentId: string, slideId: string): Promise<boolean> {
  const [p] = await db
    .select({ completedAt: slideProgress.completedAt })
    .from(slideProgress)
    .where(and(eq(slideProgress.enrollmentId, enrollmentId), eq(slideProgress.slideId, slideId)))
    .limit(1);
  return !!p?.completedAt;
}

/** Gate avanzamento: la slide va completata (tempo minimo + audio) prima di proseguire. */
export async function assertSlideCompleted(enrollmentId: string, slideId: string): Promise<void> {
  if (!(await isSlideCompleted(enrollmentId, slideId))) {
    throw new Error("Slide non completata: tempo minimo o completamento audio non raggiunti.");
  }
}

/** Secondi effettivi totali fruiti per un corso (per timer e readiness certificato).
 * `exec` opzionale: l'entry-point che apre withTenant passa il proprio tx così la
 * lettura eredita le GUC di tenant (una sola transazione, niente annidamenti). */
export async function courseEffectiveSeconds(
  enrollmentId: string,
  courseId: string,
  exec: DbOrTx = db,
): Promise<number> {
  const rows = await exec
    .select({ s: slideProgress.effectiveSeconds })
    .from(slideProgress)
    .innerJoin(slide, eq(slide.id, slideProgress.slideId))
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(courseModule, eq(courseModule.id, lesson.moduleId))
    .where(and(eq(slideProgress.enrollmentId, enrollmentId), eq(courseModule.courseId, courseId)));
  return rows.reduce((a, r) => a + r.s, 0);
}
