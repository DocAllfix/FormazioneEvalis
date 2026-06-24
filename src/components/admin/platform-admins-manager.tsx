"use client";

// Gestione admin di piattaforma: promuovi per email, rimuovi (non te stesso).
// Consuma promotePlatformAdminAction / revokePlatformAdminAction.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";
import {
  promotePlatformAdminAction,
  revokePlatformAdminAction,
} from "@/features/platform/admin-actions";

type Admin = { id: string; name: string; email: string };

export function PlatformAdminsManager({
  admins,
  currentUserId,
}: {
  admins: Admin[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function promote(e: React.FormEvent) {
    e.preventDefault();
    setPromoting(true);
    setError("");
    try {
      await promotePlatformAdminAction(email.trim());
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promozione non riuscita.");
    } finally {
      setPromoting(false);
    }
  }

  async function revoke(id: string) {
    setBusyId(id);
    setError("");
    try {
      await revokePlatformAdminAction(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rimozione non riuscita.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <form
        onSubmit={promote}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="promote-email" className="text-sm font-medium text-near-black">
            Promuovi ad admin di piattaforma
          </label>
          <input
            id="promote-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@evalis.it"
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            L&apos;utente deve essersi già registrato. Non assegnabile da soli.
          </p>
        </div>
        <button
          type="submit"
          disabled={promoting || !email.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {promoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Promuovi
        </button>
      </form>

      {admins.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
          Nessun admin con ruolo salvato. Gli account in allowlist email funzionano comunque (bootstrap).
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {admins.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-medium text-near-black">{a.name || "Senza nome"}</div>
                  <div className="text-xs text-muted-foreground">{a.email}</div>
                </div>
              </div>
              {a.id === currentUserId ? (
                <span className="text-xs text-muted-foreground">tu</span>
              ) : (
                <button
                  onClick={() => revoke(a.id)}
                  disabled={busyId === a.id}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/5 disabled:opacity-50"
                >
                  {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Rimuovi
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
