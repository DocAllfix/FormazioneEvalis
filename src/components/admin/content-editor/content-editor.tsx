"use client";

// Orchestratore dell'editor contenuti: prerequisito ISO 19011 (informativo) + due schede —
// Struttura (titoli) e Esami & domande (config quiz + banca domande). Riceve l'albero dal server.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { setCoursePrerequisite } from "@/features/courses/content-actions";
import { StructureEditor } from "./structure-editor";
import { QuizEditor } from "./quiz-editor";
import type { CourseTree } from "@/features/courses/admin-catalog";

const fieldCls = "rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none ring-primary/30 focus:ring-2";

function PrerequisiteEditor({
  courseId,
  current,
  candidates,
}: {
  courseId: string;
  current: string | null;
  candidates: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      await setCoursePrerequisite(courseId, value || null);
      setMsg("Prerequisito salvato.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Salvataggio non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-medium text-near-black">Prerequisito ISO 19011 (informativo)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Se questo è un corso auditor ISO, indica il corso ISO 19011 propedeutico. Non blocca l&apos;accesso:
        attiva solo l&apos;avviso e l&apos;offerta bundle per chi non è certificato 19011.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select value={value} onChange={(e) => setValue(e.target.value)} className={fieldCls}>
          <option value="">— Nessuno (corso non ISO / la 19011 stessa)</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salva
        </button>
        {msg ? <span className="text-sm text-success">{msg}</span> : null}
        {err ? <span className="inline-flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{err}</span> : null}
      </div>
    </section>
  );
}

export function ContentEditor({ tree }: { tree: CourseTree }) {
  return (
    <div className="flex flex-col gap-5">
      <PrerequisiteEditor
        courseId={tree.id}
        current={tree.prerequisiteCourseId}
        candidates={tree.prerequisiteCandidates}
      />
      <Tabs defaultValue="struttura" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="struttura">Struttura</TabsTrigger>
          <TabsTrigger value="esami">Esami &amp; domande</TabsTrigger>
        </TabsList>
        <TabsContent value="struttura">
          <StructureEditor modules={tree.modules} />
        </TabsContent>
        <TabsContent value="esami">
          <QuizEditor courseId={tree.id} quizzes={tree.quizzes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
