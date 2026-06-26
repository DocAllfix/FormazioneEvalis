"use client";

// Thread di un ticket (condiviso discente/staff). `role` decide quali server-action chiamare.
// I messaggi dello staff sono allineati/colorati diversamente da quelli del discente.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  replyMyTicketAction,
  closeMyTicketAction,
  staffReplyTicketAction,
  staffSetTicketStatusAction,
} from "@/features/support/server-actions";
import type { TicketDetail, TicketStatus } from "@/features/support/lifecycle";

const statusInfo: Record<TicketStatus, { text: string; cls: string }> = {
  open: { text: "Aperto", cls: "bg-warning/10 text-warning" },
  pending: { text: "In lavorazione", cls: "bg-primary/10 text-primary" },
  closed: { text: "Chiuso", cls: "bg-secondary text-muted-foreground" },
};

export function TicketThread({
  ticket,
  viewerId,
  role,
}: {
  ticket: TicketDetail;
  viewerId: string;
  role: "user" | "staff";
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const backHref = role === "staff" ? "/staff/ticket" : "/assistenza";
  const closed = ticket.status === "closed";
  const info = statusInfo[ticket.status];

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (role === "staff") await staffReplyTicketAction(ticket.id, body);
      else await replyMyTicketAction(ticket.id, body);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'invio.");
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    setBusy(true);
    setError("");
    try {
      if (role === "staff") await staffSetTicketStatusAction(ticket.id, "closed");
      else await closeMyTicketAction(ticket.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nella chiusura.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-near-black"
      >
        <ArrowLeft className="h-4 w-4" /> Indietro
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <h1 className="font-heading text-2xl text-near-black">{ticket.subject}</h1>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${info.cls}`}>{info.text}</span>
      </div>

      <div className="mt-6 space-y-3">
        {ticket.messages.map((m) => {
          const mine = m.authorId === viewerId;
          const fromStaff = m.authorId !== ticket.userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  fromStaff ? "bg-primary/10 text-near-black" : "border border-border bg-card text-foreground"
                }`}
              >
                <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                  {fromStaff ? "Staff Evalis" : "Discente"} · {new Date(m.createdAt).toLocaleString("it-IT")}
                </div>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {closed ? (
        <p className="mt-6 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Questo ticket è chiuso.
        </p>
      ) : (
        <form onSubmit={reply} className="mt-6 flex flex-col gap-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Scrivi una risposta…"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={close} disabled={busy}>
              <CheckCircle2 className="h-4 w-4" /> Chiudi ticket
            </Button>
            <Button type="submit" disabled={busy || !body.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Invia
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
