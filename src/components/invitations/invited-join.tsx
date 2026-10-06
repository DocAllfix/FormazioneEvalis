"use client";

// Iscrizione via INVITO (dipendente B2B non ancora registrato). L'id dell'invito lo conosce
// anche chi invita, quindi NON prova il possesso dell'email: l'account si conferma con il link
// mandato alla casella, come ogni altro. Dal link si torna a questa pagina, già dentro, e si
// accetta l'invito. La schermata è la stessa che l'email abbia già un account oppure no.

import { useState } from "react";
import Link from "next/link";
import { Building2, Loader2, Mail } from "lucide-react";
import { signUp } from "@/lib/auth/client";

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
  const [sent, setSent] = useState(false);
  const ritorno = `/accept-invitation/${invitationId}`;
  const loginHref = `/login?next=${encodeURIComponent(ritorno)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    setLoading(true);
    // callbackURL: dopo il clic sul link di conferma si torna qui, già dentro, per accettare
    const { error: suErr } = await signUp.email({ email, password, name, callbackURL: ritorno });
    setLoading(false);
    if (suErr) {
      setError(suErr.message || "Impossibile completare l'iscrizione.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mail className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-heading text-2xl text-near-black">Controlla la tua email</h1>
        <div className="mt-2 space-y-3 text-sm text-muted-foreground">
          <p>
            Abbiamo inviato un link di conferma a <strong className="text-near-black">{email}</strong>.
            Aprilo per attivare l&apos;account: tornerai qui per unirti a {orgName}.
          </p>
          <p>Non la trovi? Controlla nella cartella spam.</p>
          <p>
            Hai già un account?{" "}
            <Link href={loginHref} className="font-medium text-primary hover:underline">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    );
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
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Hai già un account?{" "}
        <Link href={loginHref} className="font-medium text-primary hover:underline">
          Accedi
        </Link>
      </p>
    </div>
  );
}
