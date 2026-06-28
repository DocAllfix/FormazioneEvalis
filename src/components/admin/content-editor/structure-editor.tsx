"use client";

// Struttura del corso (moduli → lezioni → slide) con titoli modificabili in-place.
// Il contenuto on-screen delle slide (HTML avatar) NON è modificabile qui: appartiene alla
// pipeline di generazione. Qui si correggono solo i titoli.

import { useState, type ReactNode } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { updateModuleTitle, updateLessonTitle, updateSlideTitle } from "@/features/courses/content-actions";
import type { CourseTree } from "@/features/courses/admin-catalog";

const fieldCls =
  "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none ring-primary/30 focus:ring-2";

function InlineTitle({ value, onSave, className }: { value: string; onSave: (t: string) => Promise<void>; className?: string }) {
  const [v, setV] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [err, setErr] = useState("");

  async function commit() {
    const next = v.trim();
    if (next === value.trim() || !next) {
      setV(value);
      return;
    }
    setState("saving");
    setErr("");
    try {
      await onSave(next);
      setState("ok");
      setTimeout(() => setState("idle"), 1500);
    } catch (e) {
      setState("err");
      setErr(e instanceof Error ? e.message : "Salvataggio non riuscito.");
      setV(value);
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className={fieldCls}
        />
        {state === "saving" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        {state === "ok" && <Check className="h-4 w-4 shrink-0 text-success" />}
        {state === "err" && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
      </div>
      {state === "err" && err ? <p className="mt-1 text-xs text-destructive">{err}</p> : null}
    </div>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] items-start gap-3 py-1.5">
      <span className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function StructureEditor({ modules }: { modules: CourseTree["modules"] }) {
  if (modules.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun modulo. La struttura si crea via import del corso.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {modules.map((m, mi) => (
        <section key={m.id} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modulo {mi + 1}</p>
          <Row label="Titolo">
            <InlineTitle value={m.title} onSave={(t) => updateModuleTitle(m.id, t)} />
          </Row>
          <div className="mt-2 flex flex-col gap-4 border-t border-border/60 pt-3">
            {m.lessons.map((l, li) => (
              <div key={l.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <Row label={`Lezione ${li + 1}`}>
                  <InlineTitle value={l.title} onSave={(t) => updateLessonTitle(l.id, t)} />
                </Row>
                {l.slides.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2 pl-2">
                    {l.slides.map((s, si) => (
                      <div key={s.id} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                        <span className="text-xs text-muted-foreground">Slide {si + 1}</span>
                        <InlineTitle value={s.title} onSave={(t) => updateSlideTitle(s.id, t)} />
                        <span className="flex items-center gap-1.5">
                          {s.hasAvatar && <Badge variant="secondary" className="text-[10px]">avatar</Badge>}
                          <span className="text-[10px] text-muted-foreground">{s.audioSeconds}s</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
