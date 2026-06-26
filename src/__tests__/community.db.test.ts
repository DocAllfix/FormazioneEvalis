// Forum community — integrazione DB. Flusso crea→rispondi→edit→report→moderazione+lock,
// authz app-layer (un utente non modifica/cancella i post altrui) e scrittura sotto app_rls
// (policy passthrough). Globale: niente isolamento per-tenant da testare.

import { describe, it, expect, afterAll } from "vitest";
import { sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, organization, activityLog } from "@/lib/db/schema";
import { firstMembershipOrgId } from "@/features/auth/guards";
import {
  listCategories,
  listThreads,
  getThread,
  createThread,
  replyToThread,
  editOwnPost,
  deleteOwnPost,
  reportPost,
  setPostHidden,
  setThreadLocked,
  listOpenReports,
  resolveReport,
} from "@/features/community/lifecycle";

const RUN = Date.now();
const PW = "Password123!";
const userIds: string[] = [];
const orgIds: string[] = [];

afterAll(async () => {
  if (orgIds.length) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.audit_maintenance = 'on'`);
      await tx.delete(activityLog).where(inArray(activityLog.organizationId, orgIds));
    });
  }
  if (userIds.length) {
    await db.delete(organization).where(inArray(organization.slug, userIds.map((id) => `u-${id}`)));
    await db.delete(user).where(inArray(user.id, userIds)); // cascade thread/post/report/modlog
  }
});

async function mkUser(tag: string) {
  const res = await auth.api.signUpEmail({ body: { name: tag, email: `forum-${tag}+${RUN}@example.test`, password: PW } });
  const uid = res.user.id;
  userIds.push(uid);
  const orgId = (await firstMembershipOrgId(uid))!;
  orgIds.push(orgId);
  return { uid, orgId };
}

describe("Forum community", () => {
  it("crea → rispondi → edit/authz → report → moderazione → lock; scrittura app_rls", async () => {
    const A = await mkUser("A");
    const B = await mkUser("B");
    const S = await mkUser("S"); // staff (moderazione)

    const cats = await listCategories();
    expect(cats.length).toBeGreaterThanOrEqual(3);
    const generale = cats.find((c) => c.slug === "generale")!;

    // A crea un thread (primo post)
    const { id: tId } = await createThread({
      authorId: A.uid,
      orgId: A.orgId,
      categoryId: generale.id,
      title: "Benvenuti",
      body: "Ciao a tutti",
    });
    let detail = await getThread(tId);
    expect(detail?.title).toBe("Benvenuti");
    expect(detail?.posts.length).toBe(1);

    // B risponde
    await replyToThread({ authorId: B.uid, orgId: B.orgId, threadId: tId, body: "Ciao!" });
    detail = await getThread(tId, true);
    expect(detail?.posts.length).toBe(2);
    const aPost = detail!.posts.find((p) => p.authorId === A.uid)!;
    const bPost = detail!.posts.find((p) => p.authorId === B.uid)!;

    // B modifica il PROPRIO post; A NON può toccarlo
    await editOwnPost({ postId: bPost.id, authorId: B.uid, body: "Ciao a tutti!!" });
    await expect(editOwnPost({ postId: bPost.id, authorId: A.uid, body: "intruso" })).rejects.toThrow();
    await expect(deleteOwnPost({ postId: bPost.id, authorId: A.uid })).rejects.toThrow();

    // B segnala il post di A
    await reportPost({ postId: aPost.id, reporterId: B.uid, reason: "spam" });
    const reports = await listOpenReports();
    const rep = reports.find((r) => r.postId === aPost.id)!;
    expect(rep).toBeTruthy();

    // staff nasconde il post di A → ai discenti non arriva, allo staff sì
    await setPostHidden({ postId: aPost.id, hidden: true, staffId: S.uid });
    expect((await getThread(tId, false))?.posts.length).toBe(1);
    expect((await getThread(tId, true))?.posts.length).toBe(2);

    // staff blocca il thread → niente risposte
    await setThreadLocked({ threadId: tId, locked: true, staffId: S.uid });
    await expect(
      replyToThread({ authorId: A.uid, orgId: A.orgId, threadId: tId, body: "ancora?" }),
    ).rejects.toThrow();

    // staff risolve la segnalazione
    await resolveReport({ reportId: rep.id, staffId: S.uid });
    expect((await listOpenReports()).some((r) => r.id === rep.id)).toBe(false);

    // lista thread: compare con postsCount
    const threads = await listThreads(generale.id);
    const row = threads.find((t) => t.id === tId)!;
    expect(row.postsCount).toBe(2);

    // scrittura sotto app_rls (policy passthrough): insert post come app_rls riesce
    await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE app_rls`);
      await tx.execute(
        sql`INSERT INTO forum_post (thread_id, author_id, body) VALUES (${tId}, ${B.uid}, 'da app_rls')`,
      );
      const n = (await tx.execute(sql`SELECT count(*)::int AS n FROM forum_post WHERE thread_id = ${tId}`)) as unknown as { n: number }[];
      expect(n[0].n).toBe(3);
    });
  }, 60000);
});
