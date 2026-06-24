"use client";

// Lista corsi globali (admin piattaforma): stato, ore, slide, pubblica/ritira.
// Consuma setCoursePublishedAction.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setCoursePublishedAction } from "@/features/courses/authoring-actions";
import type { AdminCourse } from "@/features/courses/admin-catalog";

function hoursLabel(c: AdminCourse): string {
  if (c.durationHours && c.durationHours > 0) return `${c.durationHours} ore`;
  return c.requiredMinutes >= 60 ? `~${Math.round(c.requiredMinutes / 60)} ore` : `~${c.requiredMinutes} min`;
}

export function AdminCourseList({ courses }: { courses: AdminCourse[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggle(c: AdminCourse) {
    setBusyId(c.id);
    setError("");
    try {
      await setCoursePublishedAction(c.id, c.status !== "published");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operazione non riuscita.");
    } finally {
      setBusyId(null);
    }
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
        <h2 className="font-heading text-xl text-near-black">Nessun corso ancora</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">Crea il primo corso con l&apos;import in blocco.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Corso</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 text-center font-medium">Slide</th>
              <th className="px-4 py-3 text-center font-medium">Ore</th>
              <th className="px-4 py-3 text-right font-medium">Catalogo</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const published = c.status === "published";
              return (
                <tr key={c.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium text-near-black">{c.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${published ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {published ? "Pubblicato" : "Bozza"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-foreground/80">{c.slides}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-foreground/80">{hoursLabel(c)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggle(c)}
                      disabled={busyId === c.id}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-near-black transition hover:bg-secondary/40 disabled:opacity-50"
                    >
                      {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {published ? "Ritira" : "Pubblica"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
