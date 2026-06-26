"use client";

// Vista thread del forum: post + composer di risposta. Azioni per ruolo:
//  - autore del post: modifica / elimina i propri;
//  - altri: segnala;
//  - staff (isStaff): nascondi/mostra, elimina, blocca/sblocca il thread.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, LockOpen, Pencil, Send, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  replyThreadAction,
  editPostAction,
  deletePostAction,
  reportPostAction,
  staffSetPostHiddenAction,
  staffDeletePostAction,
  staffSetThreadLockedAction,
} from "@/features/community/server-actions";
import type { ForumThreadDetail, ForumPostView } from "@/features/community/lifecycle";

export function ThreadView({
  thread,
  viewerId,
  isStaff,
}: {
  thread: ForumThreadDetail;
  viewerId: string;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    fn()
      .then(() => router.refresh())
      .catch((e) => setError(e instanceof Error ? e.message : "Errore."))
      .finally(() => setBusy(false));
  }

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      await replyThreadAction(thread.id, body);
      setBody("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nell'invio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/forum" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-near-black">
        <ArrowLeft className="h-4 w-4" /> Torna al forum
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{thread.categoryName}</p>
          <h1 className="mt-1 font-heading text-2xl text-near-black">
            {thread.title}
            {thread.locked ? (
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-medium text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> bloccato
              </span>
            ) : null}
          </h1>
        </div>
        {isStaff ? (
          <Button
            variant="outline"
            onClick={() => run(() => staffSetThreadLockedAction(thread.id, !thread.locked))}
            disabled={busy}
          >
            {thread.locked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {thread.locked ? "Sblocca" : "Blocca"}
          </Button>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {thread.posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            isOwn={p.authorId === viewerId}
            isStaff={isStaff}
            busy={busy}
            run={run}
          />
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {thread.locked ? (
        <p className="mt-6 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Questa discussione è bloccata.
        </p>
      ) : (
        <form onSubmit={reply} className="mt-6 flex flex-col gap-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Scrivi una risposta…"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !body.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Rispondi
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function PostCard({
  post,
  isOwn,
  isStaff,
  busy,
  run,
}: {
  post: ForumPostView;
  isOwn: boolean;
  isStaff: boolean;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);

  return (
    <div className={`rounded-2xl border bg-card p-4 ${post.hidden ? "border-dashed border-destructive/40" : "border-border"}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-near-black">{post.authorName}</span>
        <span className="text-[11px] text-muted-foreground">
          {post.hidden ? <span className="mr-2 text-destructive">nascosto</span> : null}
          {new Date(post.createdAt).toLocaleString("it-IT")}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <Button
              onClick={() =>
                run(async () => {
                  await editPostAction(post.id, draft);
                  setEditing(false);
                })
              }
              disabled={busy || !draft.trim()}
            >
              Salva
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={busy}>
              Annulla
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-foreground">{post.body}</p>
      )}

      {!editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {isOwn ? (
            <>
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-near-black">
                <Pencil className="h-3.5 w-3.5" /> Modifica
              </button>
              <button
                onClick={() => run(() => deletePostAction(post.id))}
                disabled={busy}
                className="inline-flex items-center gap-1 text-destructive hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" /> Elimina
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                const reason = window.prompt("Motivo della segnalazione?")?.trim();
                if (reason) run(() => reportPostAction(post.id, reason));
              }}
              disabled={busy}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Segnala
            </button>
          )}

          {isStaff ? (
            <>
              <span className="text-border">·</span>
              <button
                onClick={() => run(() => staffSetPostHiddenAction(post.id, !post.hidden))}
                disabled={busy}
                className="text-muted-foreground hover:text-near-black"
              >
                {post.hidden ? "Mostra" : "Nascondi"}
              </button>
              <button
                onClick={() => run(() => staffDeletePostAction(post.id))}
                disabled={busy}
                className="text-destructive hover:underline"
              >
                Elimina (staff)
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
