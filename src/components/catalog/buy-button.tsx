"use client";

// Bottone acquisto B2C: avvia il checkout Stripe e reindirizza. Nessuna logica di
// pagamento qui (la verità di stato arriva dal webhook, l'enrollment compare dopo).

import { useState } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
import { buyCourseAction } from "@/features/billing/server-actions";

export function BuyButton({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setLoading(true);
    setError("");
    try {
      const url = await buyCourseAction(courseId);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile avviare l'acquisto.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={buy}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        Acquista il corso
      </button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
