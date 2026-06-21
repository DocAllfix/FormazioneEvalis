// Tracciamento server-authoritative per-unità (slide). Il SERVER ricalcola i secondi
// effettivi dagli heartbeat: accredita un intervallo solo se play + focus + avanzamento
// coerente (posizione ≈ tempo reale). Ignora salti avanti/indietro, pause, AFK, gap.
// La verità è qui, non nel client. Requisito Accordo: tracciabilità per-unità.

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slide, slideProgress, lesson, module } from "@/lib/db/schema";
import { heartbeat } from "@/lib/db/schema";
import { appendActivity, auditContextFromEnrollment } from "@/features/audit/log";

export const CREDIT_TOLERANCE_SECONDS = 3; // scarto ammesso tra tempo reale e avanzamento posizione
export const MAX_GAP_MS = 30_000; // oltre questo, l'intervallo non viene accreditato

/** Quanti secondi accreditare tra due heartbeat consecutivi (LOGICA PURA, testabile). */
export function creditableSeconds(p: {
  prevTsMs: number | null;
  prevFocus: boolean | null;
  prevPosition: number | null;
  nowMs: number;
  position: number;
  focus: boolean;
  playing: boolean;
  maxGapMs?: number;
}): number {
  if (p.prevTsMs === null || p.prevPosition === null) return 0; // primo heartbeat
  if (!p.playing || !p.focus || !p.prevFocus) return 0; // deve essere in play, visibile (prima e ora)
  const wall = (p.nowMs - p.prevTsMs) / 1000;
  const pos = p.position - p.prevPosition;
  if (wall <= 0 || p.nowMs - p.prevTsMs > (p.maxGapMs ?? MAX_GAP_MS)) return 0; // gap/AFK
  if (Math.abs(pos - wall) > CREDIT_TOLERANCE_SECONDS) return 0; // salto avanti/indietro o pausa
  return Math.round(wall);
}

export async function recordHeartbeat(params: {
  enrollmentId: string;
  slideId: string;
  position: number;
  focus: boolean;
  playing: boolean;
  audioCompleted?: boolean;
  nowMs?: number; // iniettabile per i test; default = ora
}) {
  const { enrollmentId, slideId, position, focus, playing } = params;
  const nowMs = params.nowMs ?? Date.now();
  const now = new Date(nowMs);

  const [sl] = await db
    .select({ audioSeconds: slide.audioSeconds, lessonId: slide.lessonId })
    .from(slide)
    .where(eq(slide.id, slideId))
    .limit(1);
  if (!sl) throw new Error("Slide inesistente.");

  const [prev] = await db
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
  });

  // audit grezzo del ping
  await db.insert(heartbeat).values({ enrollmentId, lessonId: sl.lessonId, slideId, position, focus, ts: now });

  const [existing] = await db
    .select()
    .from(slideProgress)
    .where(and(eq(slideProgress.enrollmentId, enrollmentId), eq(slideProgress.slideId, slideId)))
    .limit(1);

  const audioCompleted = (existing?.audioCompleted ?? false) || (params.audioCompleted ?? false);
  const effectiveSeconds = (existing?.effectiveSeconds ?? 0) + credit;
  const completed = audioCompleted && effectiveSeconds >= sl.audioSeconds;
  const completedAt = completed ? existing?.completedAt ?? now : existing?.completedAt ?? null;
  const justCompleted = completed && !existing?.completedAt;
  const setValues = { effectiveSeconds, audioCompleted, completedAt, updatedAt: now };

  if (justCompleted) {
    // transizione a completata: progress + evento audit atomici
    await db.transaction(async (tx) => {
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
    });
  } else if (existing) {
    await db.update(slideProgress).set(setValues).where(eq(slideProgress.id, existing.id));
  } else {
    await db.insert(slideProgress).values({ enrollmentId, slideId, ...setValues });
  }

  return { effectiveSeconds, audioCompleted, completed };
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

/** Secondi effettivi totali fruiti per un corso (per timer e readiness certificato). */
export async function courseEffectiveSeconds(enrollmentId: string, courseId: string): Promise<number> {
  const rows = await db
    .select({ s: slideProgress.effectiveSeconds })
    .from(slideProgress)
    .innerJoin(slide, eq(slide.id, slideProgress.slideId))
    .innerJoin(lesson, eq(lesson.id, slide.lessonId))
    .innerJoin(module, eq(module.id, lesson.moduleId))
    .where(and(eq(slideProgress.enrollmentId, enrollmentId), eq(module.courseId, courseId)));
  return rows.reduce((a, r) => a + r.s, 0);
}
