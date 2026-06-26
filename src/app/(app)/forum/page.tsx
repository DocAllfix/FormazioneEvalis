import Link from "next/link";
import { MessagesSquare, Pin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/features/auth/guards";
import { listCategories, listThreads } from "@/features/community/lifecycle";
import { NewThreadDialog } from "@/components/community/new-thread-dialog";

export const metadata = { title: "Forum — Evalis" };

export default async function ForumPage() {
  await requireSession();
  const [categories, threads] = await Promise.all([listCategories(), listThreads()]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-near-black">Forum</h1>
          <p className="mt-2 text-muted-foreground">Confrontati con la community di Evalis: domande, esperienze, certificazioni.</p>
        </div>
        <NewThreadDialog categories={categories} />
      </div>

      {threads.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessagesSquare className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-heading text-xl text-near-black">Nessuna discussione</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">Apri la prima discussione e dai il via alla community.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {threads.map((t) => (
            <Link key={t.id} href={`/forum/${t.id}`} className="block">
              <Card className="flex items-center justify-between gap-4 p-5 transition hover:border-primary/30">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {t.pinned ? <Pin className="h-5 w-5" /> : <MessagesSquare className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-near-black">{t.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {catName.get(t.categoryId) ?? "—"} · {t.authorName} · {t.postsCount}{" "}
                      {t.postsCount === 1 ? "messaggio" : "messaggi"}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(t.lastPostAt).toLocaleDateString("it-IT")}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
