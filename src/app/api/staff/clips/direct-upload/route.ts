// One-time upload URL Cloudflare per il caricamento diretto dal browser. Gated admin.
import { createDirectUpload } from "@/lib/cloudflare/stream";
import { requirePlatformAdmin } from "@/features/auth/guards";

export async function POST() {
  try {
    await requirePlatformAdmin();
  } catch {
    return new Response("forbidden", { status: 403 });
  }
  try {
    const { uid, uploadURL } = await createDirectUpload();
    return Response.json({ uid, uploadURL });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "errore", { status: 500 });
  }
}
