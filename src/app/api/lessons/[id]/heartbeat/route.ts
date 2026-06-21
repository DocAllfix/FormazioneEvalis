// Endpoint heartbeat del player: riceve i ping e delega al tracciamento
// server-authoritative. L'enrollment deve appartenere all'utente in sessione.

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { enrollment } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/server";
import { recordHeartbeat } from "@/features/tracking/progress";

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

  const [enr] = await db
    .select({ userId: enrollment.userId })
    .from(enrollment)
    .where(eq(enrollment.id, body.enrollmentId))
    .limit(1);
  if (!enr || enr.userId !== ctx.user.id) return new Response("forbidden", { status: 403 });

  const result = await recordHeartbeat(body);
  return Response.json(result);
}
