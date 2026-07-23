"use client";

// Onboarding self-serve: crea lo spazio azienda (nome + sottodominio). Al successo
// il layout (admin) si ri-renderizza e mostra la console. Consuma createMyCompany.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { createMyCompany } from "@/features/admin/server-actions";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // toglie i segni diacritici (à→a)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "evalisacademy.it";

export function CompanyOnboarding({ userName }: { userName?: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createMyCompany({ name: name.trim(), slug: effectiveSlug });
      router.refresh();
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nella creazione.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Building2 className="h-6 w-6" />
      </span>
      <h1 className="mt-5 font-heading text-2xl text-near-black">Crea lo spazio azienda</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {userName ? `${userName}, ` : ""}gestisci dipendenti, posti e assegnazioni dei corsi da
        un unico pannello dedicato.
      </p>

      {error ? (
        <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-near-black">
            Nome azienda
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme S.r.l."
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
          />
        </div>
        <div>
          <label htmlFor="slug" className="text-sm font-medium text-near-black">
            Sottodominio
          </label>
          <div className="mt-1.5 flex items-center rounded-lg border border-border bg-background pr-3 focus-within:ring-2 focus-within:ring-primary/30">
            <input
              id="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="acme"
              required
              className="w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
            />
            <span className="shrink-0 text-sm text-muted-foreground">.{ROOT.split(":")[0]}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            L'indirizzo dedicato dell'azienda. Solo lettere minuscole, numeri e trattini.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !effectiveSlug}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Crea spazio azienda
        </button>
      </form>
    </div>
  );
}
