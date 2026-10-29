// Recensioni sul SITO PUBBLICO: solo attraverso le due funzioni SQL della migrazione 0037
// (opinioni approvate e con consenso; medie su tutti i voti non nascosti). Nessuna sessione:
// le funzioni non restituiscono email né id utente. Cache di 5 minuti con il tag «recensioni»,
// che le azioni di salvataggio e moderazione invalidano.

import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { MIN_VOTI_MEDIA } from "./regole";

export type OpinionePubblica = {
  id: string;
  nome: string;
  votoCorso: number;
  votoPiattaforma: number | null;
  testo: string;
  corso: string;
  corsoSlug: string | null;
};

export type Media = { numero: number; media: number } | null;

export async function _opinioniPubbliche(opts: { corsoId?: string | null; soloEvidenza?: boolean; limite?: number }): Promise<OpinionePubblica[]> {
  const righe = (await db.execute(
    sql`SELECT id, nome_pubblico, voto_corso, voto_piattaforma, testo, course_title, course_slug FROM recensioni_pubbliche(${opts.corsoId ?? null}::uuid, ${opts.soloEvidenza ?? false}, ${opts.limite ?? 12})`,
  )) as unknown as {
    id: string; nome_pubblico: string; voto_corso: number; voto_piattaforma: number | null; testo: string; course_title: string; course_slug: string | null;
  }[];
  return righe.map((r) => ({
    id: r.id,
    nome: r.nome_pubblico,
    votoCorso: Number(r.voto_corso),
    votoPiattaforma: r.voto_piattaforma === null ? null : Number(r.voto_piattaforma),
    testo: r.testo,
    corso: r.course_title,
    corsoSlug: r.course_slug,
  }));
}

/** Media dei voti del corso (o della piattaforma con null); null sotto la soglia minima di voti. */
export async function _mediaRecensioni(corsoId: string | null): Promise<Media> {
  const [r] = (await db.execute(sql`SELECT numero, media FROM media_recensioni(${corsoId}::uuid)`)) as unknown as { numero: number; media: string | null }[];
  const numero = Number(r?.numero ?? 0);
  if (numero < MIN_VOTI_MEDIA || r?.media == null) return null;
  return { numero, media: Number(r.media) };
}

const OPZ = { revalidate: 300, tags: ["recensioni"] };
export const opinioniPubbliche = unstable_cache(_opinioniPubbliche, ["recensioni:opinioni"], OPZ);
export const mediaRecensioni = unstable_cache(_mediaRecensioni, ["recensioni:media"], OPZ);
