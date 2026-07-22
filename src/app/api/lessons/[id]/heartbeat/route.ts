// Endpoint heartbeat del player: riceve i ping e delega al tracciamento
// server-authoritative. L'enrollment deve appartenere all'utente in sessione.

import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/server";
import { assertEnrollmentOwnedBy } from "@/features/access/ownership";
import { recordHeartbeat } from "@/features/tracking/progress";
import { checkLimit, tooManyRequests } from "@/lib/security/rate-limit";

const bodySchema = z.object({
  enrollmentId: z.string().uuid(),
  slideId: z.string().uuid(),
  position: z.number().int().nonnegative(),
  focus: z.boolean(),
  playing: z.boolean(),
  audioCompleted: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ctx = await getCurrentSession();
  if (!ctx) return new Response("unauthorized", { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("bad request", { status: 400 });
  const body = parsed.data;

  // C-1: cap di sanità anti-spam per enrollment (uso normale ≈ 12-20 ping/min; qui 120/min è
  // molto largo → non tocca mai un discente reale, ferma solo un client scriptato). Il tempo
  // minimo è comunque già a prova di script (creditableSeconds cappa sul tempo reale).
  if (!(await checkLimit(`hb:${body.enrollmentId}`, 120, 60_000))) return tooManyRequests(60_000);

  try {
    await assertEnrollmentOwnedBy(body.enrollmentId, ctx.user.id);
  } catch {
    return new Response("forbidden", { status: 403 });
  }

  const result = await recordHeartbeat({ ...body, ctx: { userId: ctx.user.id } });
  return Response.json(result);
}
