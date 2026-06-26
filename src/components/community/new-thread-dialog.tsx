"use client";

// Dialog "Nuovo thread": categoria + titolo + messaggio → createThreadAction → vai al thread.

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
import { createThreadAction } from "@/features/community/server-actions";

export function NewThreadDialog({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { id } = await createThreadAction(categoryId, title, body);
      setOpen(false);
      setTitle("");
      setBody("");
      router.push(`/forum/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nella creazione.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuovo thread
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apri una discussione</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="cat" className="text-sm font-medium text-near-black">
              Categoria
            </label>
            <select
              id="cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium text-near-black">
              Titolo
            </label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Di cosa vuoi parlare?" required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="body" className="text-sm font-medium text-near-black">
              Messaggio
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Scrivi il primo messaggio…"
              required
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={busy || !categoryId || !title.trim() || !body.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Pubblica
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
