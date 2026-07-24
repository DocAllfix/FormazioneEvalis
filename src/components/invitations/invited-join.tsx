"use client";

// Iscrizione via INVITO (dipendente B2B non ancora registrato). Il link d'invito prova il possesso
// dell'email → niente verifica email separata, niente password temporanee. Un'unica schermata:
// crea account → verifica (via id invito) → accedi → diventa membro → entra sul sottodominio.

import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { signUp, signIn } from "@/lib/auth/client";
import { verifyInvitedAccountAction, acceptInvitationAction } from "@/features/admin/server-actions";

export function InvitedJoin({
  invitationId,
  email,
  orgName,
}: {
  invitationId: string;
  email: string;
  orgName: string;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    setLoading(true);
    try {
      // 1) crea l'account (l'hook salta l'org personale perché esiste un invito pending)
      await signUp.email({ email, password, name });
      // 2) verifica l'account: l'id dell'invito prova il possesso dell'email
      await verifyInvitedAccountAction(invitationId);
      // 3) accedi (ora verificato → sessione, cookie condiviso su .dominio)
      const { error: siErr } = await signIn.email({ email, password });
      if (siErr) throw new Error(siErr.message || "Accesso non riuscito.");
      // 4) diventa membro dell'azienda
      await acceptInvitationAction(invitationId);
      // 5) entra: siamo già sul sottodominio dell'azienda
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile completare l'iscrizione.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Building2 className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-center font-heading text-2xl text-near-black">Unisciti a {orgName}</h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">
        Sei stato invitato. Crea il tuo accesso per iniziare i corsi assegnati.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="inv-email" className="text-sm font-medium text-near-black">Email</label>
          <input
            id="inv-email"
            value={email}
            readOnly
            className="mt-1.5 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground outline-none"
          />
        </div>
        <div>
          <label htmlFor="inv-name" className="text-sm font-medium text-near-black">Nome e cognome</label>
          <input
            id="inv-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mario Rossi"
            autoComplete="name"
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="inv-password" className="text-sm font-medium text-near-black">Password</label>
          <input
            id="inv-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Almeno 8 caratteri"
            autoComplete="new-password"
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim() || password.length < 8}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Crea accesso e unisciti
        </button>
      </form>
    </div>
  );
}
