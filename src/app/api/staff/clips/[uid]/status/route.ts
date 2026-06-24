// Stato di processing di una clip (ready + durata) per il polling del wizard. Gated admin.
import { getClipStatus } from "@/lib/cloudflare/stream";
import { requirePlatformAdmin } from "@/features/auth/guards";

export async function GET(_req: Request, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await requirePlatformAdmin();
  } catch {
    return new Response("forbidden", { status: 403 });
  }
  const { uid } = await params;
  try {
    return Response.json(await getClipStatus(uid));
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "errore", { status: 500 });
  }
}
