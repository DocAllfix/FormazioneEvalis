// Upload immagine corso (admin piattaforma) → bucket pubblico Supabase + course.imageUrl. Gated.
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
import { uploadCourseImage } from "@/lib/supabase/storage";
import { requirePlatformAdmin } from "@/features/auth/guards";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
  } catch {
    return new Response("forbidden", { status: 403 });
  }
  const { id } = await params;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return new Response("file mancante", { status: 400 });
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const url = await uploadCourseImage(id, bytes, ext);
    await db.update(course).set({ imageUrl: url }).where(eq(course.id, id));
    return Response.json({ imageUrl: url });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "errore", { status: 500 });
  }
}
