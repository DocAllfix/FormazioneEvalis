// Forum community — logica (senza guard, testabile). GLOBALE: nessun isolamento per-tenant,
// nessun withTenant; in produzione l'app gira come app_rls e la policy passthrough consente
// l'accesso. Autorizzazione APP-LAYER: l'autore agisce sui propri post (controllo author_id);
// la moderazione è riservata allo staff (gated nei server-actions). Eventi contenuto nella
// catena audit dell'org dell'autore; eventi di moderazione in forum_moderation_log.

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { category, thread, post, postReport, moderationLog, user } from "@/lib/db/schema";
import { appendActivity } from "@/features/audit/log";

export type ForumCategory = { id: string; slug: string; name: string; description: string | null };
export type ForumThreadRow = {
  id: string;
  title: string;
  categoryId: string;
  pinned: boolean;
  locked: boolean;
  lastPostAt: Date;
  authorName: string;
  postsCount: number;
};
export type ForumPostView = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  hidden: boolean;
  createdAt: Date;
};
export type ForumThreadDetail = {
  id: string;
  title: string;
  locked: boolean;
  pinned: boolean;
  categoryName: string;
  authorId: string;
  posts: ForumPostView[];
};

// --- Letture ---

export async function listCategories(): Promise<ForumCategory[]> {
  return db
    .select({ id: category.id, slug: category.slug, name: category.name, description: category.description })
    .from(category)
    .orderBy(category.position);
}

export async function listThreads(categoryId?: string): Promise<ForumThreadRow[]> {
  const base = db
    .select({
      id: thread.id,
      title: thread.title,
      categoryId: thread.categoryId,
      pinned: thread.pinned,
      locked: thread.locked,
      lastPostAt: thread.lastPostAt,
      authorName: user.name,
      postsCount: sql<number>`(SELECT count(*)::int FROM forum_post p WHERE p.thread_id = ${thread.id})`,
    })
    .from(thread)
    .innerJoin(user, eq(user.id, thread.authorId));
  const rows = categoryId
    ? await base.where(eq(thread.categoryId, categoryId)).orderBy(desc(thread.pinned), desc(thread.lastPostAt))
    : await base.orderBy(desc(thread.pinned), desc(thread.lastPostAt));
  return rows as ForumThreadRow[];
}

/** Dettaglio thread + post. `includeHidden` solo per lo staff; ai discenti i post nascosti non arrivano. */
export async function getThread(threadId: string, includeHidden = false): Promise<ForumThreadDetail | null> {
  const [t] = await db
    .select({
      id: thread.id,
      title: thread.title,
      locked: thread.locked,
      pinned: thread.pinned,
      categoryName: category.name,
      authorId: thread.authorId,
    })
    .from(thread)
    .innerJoin(category, eq(category.id, thread.categoryId))
    .where(eq(thread.id, threadId))
    .limit(1);
  if (!t) return null;

  const posts = await db
    .select({
      id: post.id,
      authorId: post.authorId,
      authorName: user.name,
      body: post.body,
      hidden: post.hidden,
      createdAt: post.createdAt,
    })
    .from(post)
    .innerJoin(user, eq(user.id, post.authorId))
    .where(includeHidden ? eq(post.threadId, threadId) : and(eq(post.threadId, threadId), eq(post.hidden, false)))
    .orderBy(post.createdAt);

  return { ...t, posts };
}

// --- Scritture discente ---

/** Crea un thread con il primo post. Audit nell'org dell'autore. */
export async function createThread(params: {
  authorId: string;
  orgId: string;
  categoryId: string;
  title: string;
  body: string;
}): Promise<{ id: string }> {
  const { authorId, orgId, categoryId, title, body } = params;
  if (!title.trim() || !body.trim()) throw new Error("Titolo e messaggio sono obbligatori.");
  return db.transaction(async (tx) => {
    const [th] = await tx
      .insert(thread)
      .values({ categoryId, authorId, title: title.trim() })
      .returning({ id: thread.id });
    await tx.insert(post).values({ threadId: th.id, authorId, body: body.trim() });
    await appendActivity(tx, {
      organizationId: orgId,
      userId: authorId,
      verb: "forum-thread-created",
      object: `thread:${th.id}`,
      payload: { title: title.trim() },
    });
    return { id: th.id };
  });
}

/** Risponde a un thread. Vietato se il thread è bloccato. Audit nell'org dell'autore. */
export async function replyToThread(params: {
  authorId: string;
  orgId: string;
  threadId: string;
  body: string;
}): Promise<{ ok: true }> {
  const { authorId, orgId, threadId, body } = params;
  if (!body.trim()) throw new Error("Il messaggio non può essere vuoto.");
  return db.transaction(async (tx) => {
    const [th] = await tx.select({ id: thread.id, locked: thread.locked }).from(thread).where(eq(thread.id, threadId)).limit(1);
    if (!th) throw new Error("Discussione inesistente.");
    if (th.locked) throw new Error("Discussione bloccata: non è possibile rispondere.");
    await tx.insert(post).values({ threadId, authorId, body: body.trim() });
    await tx.update(thread).set({ lastPostAt: new Date() }).where(eq(thread.id, threadId));
    await appendActivity(tx, {
      organizationId: orgId,
      userId: authorId,
      verb: "forum-post-created",
      object: `thread:${threadId}`,
    });
    return { ok: true as const };
  });
}

/** Modifica un post: SOLO se di proprietà dell'autore. */
export async function editOwnPost(params: { postId: string; authorId: string; body: string }): Promise<{ ok: true }> {
  const { postId, authorId, body } = params;
  if (!body.trim()) throw new Error("Il messaggio non può essere vuoto.");
  const [p] = await db.select({ authorId: post.authorId }).from(post).where(eq(post.id, postId)).limit(1);
  if (!p) throw new Error("Messaggio inesistente.");
  if (p.authorId !== authorId) throw new Error("Permesso negato: non è il tuo messaggio.");
  await db.update(post).set({ body: body.trim() }).where(eq(post.id, postId));
  return { ok: true as const };
}

/** Elimina un post: SOLO se di proprietà dell'autore. */
export async function deleteOwnPost(params: { postId: string; authorId: string }): Promise<{ ok: true }> {
  const { postId, authorId } = params;
  const [p] = await db.select({ authorId: post.authorId }).from(post).where(eq(post.id, postId)).limit(1);
  if (!p) throw new Error("Messaggio inesistente.");
  if (p.authorId !== authorId) throw new Error("Permesso negato: non è il tuo messaggio.");
  await db.delete(post).where(eq(post.id, postId));
  return { ok: true as const };
}

/** Segnala un post alla moderazione. */
export async function reportPost(params: { postId: string; reporterId: string; reason: string }): Promise<{ ok: true }> {
  const { postId, reporterId, reason } = params;
  if (!reason.trim()) throw new Error("Indica un motivo per la segnalazione.");
  await db.insert(postReport).values({ postId, reporterId, reason: reason.trim() });
  return { ok: true as const };
}

// --- Moderazione staff ---

export async function setPostHidden(params: { postId: string; hidden: boolean; staffId: string }): Promise<{ ok: true }> {
  const { postId, hidden, staffId } = params;
  return db.transaction(async (tx) => {
    await tx.update(post).set({ hidden }).where(eq(post.id, postId));
    await tx.insert(moderationLog).values({ staffId, action: hidden ? "hide-post" : "unhide-post", target: `post:${postId}` });
    return { ok: true as const };
  });
}

export async function deletePostByStaff(params: { postId: string; staffId: string }): Promise<{ ok: true }> {
  const { postId, staffId } = params;
  return db.transaction(async (tx) => {
    await tx.delete(post).where(eq(post.id, postId));
    await tx.insert(moderationLog).values({ staffId, action: "delete-post", target: `post:${postId}` });
    return { ok: true as const };
  });
}

export async function setThreadLocked(params: { threadId: string; locked: boolean; staffId: string }): Promise<{ ok: true }> {
  const { threadId, locked, staffId } = params;
  return db.transaction(async (tx) => {
    await tx.update(thread).set({ locked }).where(eq(thread.id, threadId));
    await tx.insert(moderationLog).values({ staffId, action: locked ? "lock-thread" : "unlock-thread", target: `thread:${threadId}` });
    return { ok: true as const };
  });
}

export type ReportRow = { id: string; reason: string; createdAt: Date; postId: string; postBody: string; reporterName: string };

export async function listOpenReports(): Promise<ReportRow[]> {
  return db
    .select({
      id: postReport.id,
      reason: postReport.reason,
      createdAt: postReport.createdAt,
      postId: postReport.postId,
      postBody: post.body,
      reporterName: user.name,
    })
    .from(postReport)
    .innerJoin(post, eq(post.id, postReport.postId))
    .innerJoin(user, eq(user.id, postReport.reporterId))
    .where(eq(postReport.resolved, false))
    .orderBy(desc(postReport.createdAt));
}

export async function resolveReport(params: { reportId: string; staffId: string }): Promise<{ ok: true }> {
  const { reportId, staffId } = params;
  return db.transaction(async (tx) => {
    await tx.update(postReport).set({ resolved: true }).where(eq(postReport.id, reportId));
    await tx.insert(moderationLog).values({ staffId, action: "resolve-report", target: `report:${reportId}` });
    return { ok: true as const };
  });
}
