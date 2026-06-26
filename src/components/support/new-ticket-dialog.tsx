"use client";

// Dialog "Nuovo ticket": oggetto + messaggio → createMyTicketAction → vai al thread.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createMyTicketAction } from "@/features/support/server-actions";

export function NewTicketDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { id } = await createMyTicketAction(subject, body);
      setOpen(false);
      setSubject("");
      setBody("");
      router.push(`/assistenza/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'apertura del ticket.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuovo ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuova richiesta di assistenza</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="subject" className="text-sm font-medium text-near-black">
              Oggetto
            </label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Di cosa hai bisogno?"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="body" className="text-sm font-medium text-near-black">
              Messaggio
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Descrivi il problema…"
              required
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={busy || !subject.trim() || !body.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Invia richiesta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
