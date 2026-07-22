// Upload immagine corso (admin piattaforma) → bucket pubblico Supabase + course.imageUrl. Gated.
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { course } from "@/lib/db/schema";
import { uploadCourseImage } from "@/lib/supabase/storage";
import { requirePlatformAdmin } from "@/features/auth/guards";

// M-8 (audit go-live): il bucket è PUBBLICO, quindi non ci si può fidare del nome file.
// Il tipo si decide dai magic bytes del contenuto (un ".jpg" può contenere SVG/HTML con
// script, servito poi dal dominio storage) e l'estensione salvata deriva da lì, mai dall'input.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

function sniffImage(b: Uint8Array): "jpg" | "png" | "webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // "WEBP"
  ) return "webp";
  return null;
}

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
    if (file.size > MAX_IMAGE_BYTES) {
      return new Response("immagine troppo grande (max 5 MB)", { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = sniffImage(bytes);
    if (!ext) {
      return new Response("formato non supportato: solo JPEG, PNG o WEBP", { status: 400 });
    }
    const url = await uploadCourseImage(id, bytes, ext);
    await db.update(course).set({ imageUrl: url }).where(eq(course.id, id));
    return Response.json({ imageUrl: url });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "errore", { status: 500 });
  }
}
