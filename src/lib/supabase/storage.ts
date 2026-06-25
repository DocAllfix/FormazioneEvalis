// Storage dei PDF certificato su Supabase Storage (UE), bucket PRIVATO.
// Service role server-only: mai esporre questa chiave al client. Download solo via
// signed URL a TTL breve (il PDF contiene PII).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "certificates";
let client: SupabaseClient | null = null;

function storageClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY non impostate (storage certificati).");
  }
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

async function ensureBucket(c: SupabaseClient): Promise<void> {
  const { data } = await c.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await c.storage.createBucket(BUCKET, { public: false });
    // ignora la corsa "già esistente"
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

export async function uploadCertificatePdf(verifyUuid: string, bytes: Uint8Array): Promise<string> {
  const c = storageClient();
  await ensureBucket(c);
  const path = `${verifyUuid}.pdf`;
  const { error } = await c.storage
    .from(BUCKET)
    .upload(path, Buffer.from(bytes), { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  return path;
}

export async function signedCertificateUrl(path: string, ttlSeconds = 300): Promise<string> {
  const c = storageClient();
  const { data, error } = await c.storage.from(BUCKET).createSignedUrl(path, ttlSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteCertificatePdf(path: string): Promise<void> {
  const c = storageClient();
  await c.storage.from(BUCKET).remove([path]);
}

// --- Immagini corso (bucket PUBBLICO: non sono PII, servite via URL pubblico) ---
const IMAGE_BUCKET = "course-images";

async function ensurePublicBucket(c: SupabaseClient): Promise<void> {
  const { data } = await c.storage.getBucket(IMAGE_BUCKET);
  if (!data) {
    const { error } = await c.storage.createBucket(IMAGE_BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

/** Carica l'immagine di un corso e ritorna l'URL pubblico stabile. */
export async function uploadCourseImage(courseId: string, bytes: Uint8Array, ext: string): Promise<string> {
  const c = storageClient();
  await ensurePublicBucket(c);
  const safeExt = /^(png|webp|jpg|jpeg)$/i.test(ext) ? ext.toLowerCase() : "jpg";
  const contentType = safeExt === "png" ? "image/png" : safeExt === "webp" ? "image/webp" : "image/jpeg";
  const path = `${courseId}.${safeExt}`;
  const { error } = await c.storage
    .from(IMAGE_BUCKET)
    .upload(path, Buffer.from(bytes), { contentType, upsert: true });
  if (error) throw error;
  return c.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function isStorageConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
