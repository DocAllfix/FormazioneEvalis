"use client";

// Accettazione invito: l'utente loggato entra nell'azienda. Consuma acceptInvitationAction.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { acceptInvitationAction } from "@/features/admin/server-actions";

export function AcceptInvitation({
  invitationId,
  userEmail,
}: {
  invitationId: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setLoading(true);
    setError("");
    try {
      await acceptInvitationAction(invitationId);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile accettare l'invito.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Building2 className="h-6 w-6" />
      </span>
      <h1 className="mt-5 font-heading text-2xl text-near-black">Sei stato invitato</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Accetta l'invito per unirti all'azienda con l'account <strong>{userEmail}</strong> e
        accedere ai corsi assegnati.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <button
        onClick={accept}
        disabled={loading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Accetta e unisciti
      </button>
    </div>
  );
}
