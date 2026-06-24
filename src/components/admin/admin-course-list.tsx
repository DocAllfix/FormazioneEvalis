"use client";

// Lista corsi globali (admin piattaforma): categoria, ore, prezzo (crea Stripe Price),
// pubblica/ritira. Controlli inline (niente modale). Consuma authoring + pricing actions.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { setCoursePublishedAction } from "@/features/courses/authoring-actions";
import { setCoursePrice, removeCoursePrice, setCourseCategory } from "@/features/billing/pricing";
import type { AdminCourse } from "@/features/courses/admin-catalog";

const CATEGORIES = [
  { value: "auditor", label: "Auditor ISO" },
  { value: "mestieri", label: "Mestieri" },
  { value: "bancario", label: "Bancario" },
  { value: "sicurezza", label: "Sicurezza" },
];

function hoursLabel(c: AdminCourse): string {
  if (c.durationHours && c.durationHours > 0) return `${c.durationHours} ore`;
  return c.requiredMinutes >= 60 ? `~${Math.round(c.requiredMinutes / 60)} ore` : `~${c.requiredMinutes} min`;
}

function priceLabel(c: AdminCourse): string {
  if (c.priceCents == null) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: (c.currency ?? "eur").toUpperCase(),
  }).format(c.priceCents / 100);
}

export function AdminCourseList({ courses }: { courses: AdminCourse[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [error, setError] = useState("");

  async function run(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operazione non riuscita.");
    } finally {
      setBusyId(null);
    }
  }

  async function savePrice(id: string) {
    const euros = parseFloat(priceInput.replace(",", "."));
    if (!Number.isFinite(euros)) {
      setError("Prezzo non valido.");
      return;
    }
    await run(id, () => setCoursePrice(id, Math.round(euros * 100)));
    setPricingId(null);
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
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Corso</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 text-center font-medium">Ore</th>
              <th className="px-4 py-3 font-medium">Prezzo</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 text-right font-medium">Catalogo</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const published = c.status === "published";
              const busy = busyId === c.id;
              return (
                <tr key={c.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium text-near-black">{c.title}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.category ?? ""}
                      disabled={busy}
                      onChange={(e) => run(c.id, () => setCourseCategory(c.id, e.target.value || null))}
                      className="min-h-9 rounded-lg border border-border bg-background px-2 py-1.5 text-xs outline-none ring-primary/30 focus:ring-2 disabled:opacity-50"
                      aria-label={`Categoria di ${c.title}`}
                    >
                      <option value="">— nessuna</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-foreground/80">{hoursLabel(c)}</td>
                  <td className="px-4 py-3">
                    {pricingId === c.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && savePrice(c.id)}
                          placeholder="49,00"
                          inputMode="decimal"
                          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-xs tabular-nums outline-none ring-primary/30 focus:ring-2"
                          aria-label="Prezzo in euro"
                        />
                        <button onClick={() => savePrice(c.id)} disabled={busy} className="rounded-md p-1.5 text-success hover:bg-success/10 disabled:opacity-50" aria-label="Salva prezzo">
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setPricingId(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Annulla">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setPricingId(c.id);
                            setPriceInput(c.priceCents != null ? (c.priceCents / 100).toFixed(2).replace(".", ",") : "");
                          }}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-near-black transition hover:bg-secondary/40"
                        >
                          {c.priceCents != null ? priceLabel(c) : "Imposta"}
                        </button>
                        {c.priceCents != null ? (
                          <button onClick={() => run(c.id, () => removeCoursePrice(c.id))} disabled={busy} className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50">
                            rimuovi
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${published ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {published ? "Pubblicato" : "Bozza"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => run(c.id, () => setCoursePublishedAction(c.id, !published))}
                      disabled={busy}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-near-black transition hover:bg-secondary/40 disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
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
