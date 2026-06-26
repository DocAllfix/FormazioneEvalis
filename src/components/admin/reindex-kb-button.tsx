"use client";

// Pulsante staff: ricostruisce il knowledge base del chatbot (FAQ + descrizioni corsi).

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { reindexKnowledgeAction } from "@/features/support/chatbot/actions";

export function ReindexKbButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true);
    setMsg("");
    try {
      const r = await reindexKnowledgeAction();
      setMsg(`KB aggiornato: ${r.documents} documenti, ${r.chunks} chunk`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Errore nel reindex.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      <button
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-near-black transition hover:bg-secondary disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Aggiorna KB chatbot
      </button>
    </div>
  );
}
