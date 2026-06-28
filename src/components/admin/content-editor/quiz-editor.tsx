"use client";

// Editor quiz: configurazione (soglia, sorteggio, tentativi, tempi) + BANCA DOMANDE
// (aggiungi / modifica / elimina). Consuma content-actions, tutte gated admin lato server.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { updateQuizConfig, upsertQuizQuestion, deleteQuizQuestion } from "@/features/courses/content-actions";
import type { CourseTree, QuestionOption } from "@/features/courses/admin-catalog";

type Quiz = CourseTree["quizzes"][number];
type Question = Quiz["questions"][number];

const fieldCls = "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none ring-primary/30 focus:ring-2";
const numCls = "w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none ring-primary/30 focus:ring-2";

function QuizConfig({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: quiz.title,
    passThreshold: quiz.passThreshold,
    questionsToDraw: quiz.questionsToDraw,
    maxAttempts: quiz.maxAttempts,
    timeLimitSeconds: quiz.timeLimitSeconds,
    cooldownSeconds: quiz.cooldownSeconds,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await updateQuizConfig(quiz.id, {
        title: form.title.trim(),
        passThreshold: form.passThreshold,
        questionsToDraw: form.questionsToDraw,
        maxAttempts: form.maxAttempts,
        timeLimitSeconds: form.timeLimitSeconds,
        cooldownSeconds: form.cooldownSeconds,
      });
      setMsg("Configurazione salvata.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  const num = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v === "" ? null : Number(v) });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-near-black">Titolo</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`mt-1.5 ${fieldCls}`} />
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
        <p className="text-xs font-medium text-amber-800">Vincoli legali (compliance) — modificare con attenzione</p>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="text-sm text-near-black">
            Soglia superamento (%)
            <input type="number" min={1} max={100} value={form.passThreshold} onChange={(e) => num("passThreshold", e.target.value)} className={`ml-2 ${numCls}`} />
          </label>
          <label className="text-sm text-near-black">
            Domande sorteggiate
            <input type="number" min={1} value={form.questionsToDraw} onChange={(e) => num("questionsToDraw", e.target.value)} className={`ml-2 ${numCls}`} />
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="text-sm text-near-black">
          Tentativi max <span className="text-muted-foreground">(vuoto = illimitati)</span>
          <input type="number" min={1} value={form.maxAttempts ?? ""} onChange={(e) => num("maxAttempts", e.target.value)} className={`ml-2 ${numCls}`} />
        </label>
        <label className="text-sm text-near-black">
          Limite tempo (s) <span className="text-muted-foreground">(0 = nessuno)</span>
          <input type="number" min={0} value={form.timeLimitSeconds} onChange={(e) => num("timeLimitSeconds", e.target.value)} className={`ml-2 ${numCls}`} />
        </label>
        <label className="text-sm text-near-black">
          Attesa dopo fallita (s)
          <input type="number" min={0} value={form.cooldownSeconds} onChange={(e) => num("cooldownSeconds", e.target.value)} className={`ml-2 ${numCls}`} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salva configurazione
        </button>
        {msg ? <span className="text-sm text-success">{msg}</span> : null}
        {err ? <span className="inline-flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{err}</span> : null}
      </div>
    </div>
  );
}

function QuestionDialog({ courseId, quizId, question, trigger }: { courseId: string; quizId: string; question?: Question; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(question?.text ?? "");
  const [options, setOptions] = useState<QuestionOption[]>(question?.options ?? [{ id: crypto.randomUUID(), text: "" }, { id: crypto.randomUUID(), text: "" }]);
  const [correct, setCorrect] = useState(question?.correctOptionId ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function reset() {
    setText(question?.text ?? "");
    setOptions(question?.options ?? [{ id: crypto.randomUUID(), text: "" }, { id: crypto.randomUUID(), text: "" }]);
    setCorrect(question?.correctOptionId ?? "");
    setErr("");
  }

  async function save() {
    setBusy(true);
    setErr("");
    try {
      await upsertQuizQuestion(courseId, quizId, {
        id: question?.id,
        text: text.trim(),
        options: options.map((o) => ({ id: o.id, text: o.text.trim() })),
        correctOptionId: correct,
      });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{question ? "Modifica domanda" : "Nuova domanda"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-near-black">Testo della domanda</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className={`mt-1.5 ${fieldCls}`} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-near-black">Opzioni <span className="font-normal text-muted-foreground">(seleziona la corretta)</span></span>
            {options.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correct === o.id} onChange={() => setCorrect(o.id)} className="h-4 w-4 accent-primary" />
                <input value={o.text} onChange={(e) => setOptions(options.map((x) => (x.id === o.id ? { ...x, text: e.target.value } : x)))} placeholder={`Opzione ${i + 1}`} className={fieldCls} />
                {options.length > 2 && (
                  <button onClick={() => { setOptions(options.filter((x) => x.id !== o.id)); if (correct === o.id) setCorrect(""); }} className="shrink-0 text-muted-foreground hover:text-destructive" aria-label="Rimuovi opzione">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button onClick={() => setOptions([...options, { id: crypto.randomUUID(), text: "" }])} className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline">
                <Plus className="h-4 w-4" /> Aggiungi opzione
              </button>
            )}
          </div>
          {err ? <p className="inline-flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{err}</p> : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-near-black transition hover:bg-secondary/40">Annulla</button>
          </DialogClose>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salva domanda
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuizEditor({ courseId, quizzes }: { courseId: string; quizzes: CourseTree["quizzes"] }) {
  if (quizzes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun quiz in questo corso.</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      {quizzes.map((qz) => (
        <section key={qz.id} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-near-black">{qz.title}</h2>
            <Badge variant={qz.type === "final" ? "default" : "secondary"}>{qz.type === "final" ? "Esame finale" : "Checkpoint"}</Badge>
          </div>
          <QuizConfig quiz={qz} />
          <div className="border-t border-border/60 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-near-black">
                Banca domande <span className="font-normal text-muted-foreground">({qz.questions.length})</span>
              </h3>
              <QuestionDialog
                courseId={courseId}
                quizId={qz.id}
                trigger={
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-near-black transition hover:bg-secondary/40">
                    <Plus className="h-4 w-4" /> Aggiungi domanda
                  </button>
                }
              />
            </div>
            {qz.questions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Banca vuota. Aggiungi almeno {qz.questionsToDraw} domande per il sorteggio.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {qz.questions.map((q) => (
                  <QuestionRowWithCtx key={q.id} courseId={courseId} quizId={qz.id} q={q} />
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

// La riga domanda ha bisogno di courseId+quizId per il dialog di modifica.
function QuestionRowWithCtx({ courseId, quizId, q }: { courseId: string; quizId: string; q: Question }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function del() {
    if (!confirm("Eliminare definitivamente questa domanda?")) return;
    setBusy(true);
    setErr("");
    try {
      await deleteQuizQuestion(q.id);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eliminazione non riuscita.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-near-black">{q.text}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <QuestionDialog
            courseId={courseId}
            quizId={quizId}
            question={q}
            trigger={<button className="text-muted-foreground hover:text-primary" aria-label="Modifica"><Pencil className="h-4 w-4" /></button>}
          />
          <button onClick={del} disabled={busy} className="text-muted-foreground hover:text-destructive disabled:opacity-50" aria-label="Elimina">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {q.options.map((o) => (
          <li key={o.id} className={`flex items-center gap-2 text-sm ${o.id === q.correctOptionId ? "text-success" : "text-muted-foreground"}`}>
            {o.id === q.correctOptionId ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="h-3.5 w-3.5 shrink-0" />}
            {o.text}
          </li>
        ))}
      </ul>
      {err ? <p className="mt-2 text-xs text-destructive">{err}</p> : null}
    </div>
  );
}
