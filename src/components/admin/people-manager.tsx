"use client";

// Gestione persone (B2B): invita dipendenti (gate posti), vedi inviti in attesa,
// assegna corsi e monitora assegnati/certificati. Consuma le Server Action admin.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, Mail, UserPlus } from "lucide-react";
import { inviteMemberAction, assignCourseAction } from "@/features/admin/server-actions";

type Member = {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  assigned: number;
  certified: number;
};
type Course = { id: string; title: string };
type Invite = { id: string; email: string; role: string };

export function PeopleManager({
  members,
  courses,
  invitations,
}: {
  members: Member[];
  courses: Course[];
  invitations: Invite[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError("");
    try {
      await inviteMemberAction(email.trim(), role);
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invito non riuscito.");
    } finally {
      setInviting(false);
    }
  }

  async function assign(userId: string, courseId: string) {
    if (!courseId) return;
    setBusyRow(userId);
    setError("");
    try {
      await assignCourseAction(userId, courseId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assegnazione non riuscita.");
    } finally {
      setBusyRow(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      {/* Invito */}
      <form
        onSubmit={invite}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="invite-email" className="text-sm font-medium text-near-black">
            Invita un dipendente
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@azienda.it"
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "admin")}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
          aria-label="Ruolo"
        >
          <option value="member">Dipendente</option>
          <option value="admin">Amministratore</option>
        </select>
        <button
          type="submit"
          disabled={inviting || !email.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Invita
        </button>
      </form>

      {/* Inviti in attesa */}
      {invitations.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-medium text-near-black">Inviti in attesa</p>
          <ul className="mt-3 flex flex-col gap-2">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-warning" />
                <span className="text-near-black">{inv.email}</span>
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  in attesa · {inv.role === "admin" ? "amministratore" : "dipendente"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Tabella membri */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Persona</th>
              <th className="px-4 py-3 font-medium">Ruolo</th>
              <th className="px-4 py-3 text-center font-medium">Corsi</th>
              <th className="px-4 py-3 text-center font-medium">Certificati</th>
              <th className="px-4 py-3 text-right font-medium">Assegna corso</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.userId}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/30"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-near-black">{m.name || "Senza nome"}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </td>
                <td className="px-4 py-3 text-foreground/80">
                  {m.role === "owner"
                    ? "Proprietario"
                    : m.role === "admin"
                      ? "Amministratore"
                      : "Dipendente"}
                </td>
                <td className="px-4 py-3 text-center tabular-nums text-foreground/80">{m.assigned}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 tabular-nums text-success">
                    {m.certified > 0 ? <BadgeCheck className="h-4 w-4" /> : null}
                    {m.certified}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {busyRow === m.userId ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
                    <select
                      defaultValue=""
                      disabled={busyRow === m.userId || courses.length === 0}
                      onChange={(e) => {
                        assign(m.userId, e.target.value);
                        e.target.value = "";
                      }}
                      className="min-h-9 rounded-lg border border-border bg-background px-2 py-2 text-xs outline-none ring-primary/30 focus:ring-2 disabled:opacity-50"
                      aria-label={`Assegna corso a ${m.name || m.email}`}
                    >
                      <option value="" disabled>
                        Assegna corso…
                      </option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
