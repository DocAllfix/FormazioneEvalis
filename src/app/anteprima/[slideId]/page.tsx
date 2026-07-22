// Anteprima-staff (C.2 audit go-live): apre QUALSIASI slide per ID con la sua clip firmata,
// senza iscrizione né gating sequenziale. NON tocca l'antifrode dei discenti (percorso separato).
// Accesso: platform admin (sessione) OPPURE ?token=<PREVIEW_TOKEN> (per l'automazione Playwright).

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slide } from "@/lib/db/schema";
import { getSignedClipUrl } from "@/lib/cloudflare/stream";
import { getCurrentSession } from "@/lib/auth/server";
import { isPlatformAdmin } from "@/features/auth/guards";
import { PreviewPlayer } from "./preview-player";

export const dynamic = "force-dynamic";

async function authorized(token: string | undefined): Promise<boolean> {
  const secret = process.env.PREVIEW_TOKEN;
  if (secret && token && token === secret) return true;
  const ctx = await getCurrentSession();
  return !!ctx && isPlatformAdmin(ctx.user as { email: string; platformRole?: string | null });
}

export default async function AnteprimaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slideId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slideId } = await params;
  const { token } = await searchParams;
  if (!(await authorized(token))) notFound(); // non riveliamo l'esistenza della pagina

  const [s] = await db.select().from(slide).where(eq(slide.id, slideId)).limit(1);
  if (!s) notFound();

  const clipUrl = s.avatarClipUid ? await getSignedClipUrl(s.avatarClipUid) : null;
  const blocks = (s.blocks ?? []) as { type?: string; html?: string }[];
  const html = blocks.find((b) => b?.type === "html")?.html ?? "";

  return <PreviewPlayer html={html} clipUrl={clipUrl} slideId={s.id} />;
}
