"use client";

// Wizard di import in blocco (admin piattaforma): incolla il manifest → abbina gli mp4
// per chiave → upload diretto a Cloudflare (con progresso) → crea il corso (ingest atomico).
// Il manifest è validato lato client con lo stesso schema del server (zod puro).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileJson, Loader2, UploadCloud } from "lucide-react";
import {
  courseManifestSchema,
  collectClipKeys,
  type CourseManifest,
  type ClipInfo,
} from "@/features/courses/authoring-manifest";
import { createCourseFromManifest } from "@/features/courses/authoring-actions";

type ClipPhase = "idle" | "uploading" | "processing" | "ready" | "error";
type ClipState = { phase: ClipPhase; progress: number; error?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fileStem = (name: string) => name.replace(/\.mp4(\.mp4)?$/i, "").trim().toLowerCase();

function uploadWithProgress(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("errore di rete in upload"));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

export function CourseImportWizard() {
  const router = useRouter();
  const [manifestText, setManifestText] = useState("");
  const [files, setFiles] = useState<Record<string, File>>({});
  const [clips, setClips] = useState<Record<string, ClipState>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ courseId: string } | null>(null);

  // Parse + validazione manifest (zod, stesso schema del server).
  const parsed = useMemo<{ manifest?: CourseManifest; error?: string; keys: string[] }>(() => {
    if (!manifestText.trim()) return { keys: [] };
    let json: unknown;
    try {
      json = JSON.parse(manifestText);
    } catch {
      return { error: "JSON non valido.", keys: [] };
    }
    const r = courseManifestSchema.safeParse(json);
    if (!r.success) return { error: r.error.issues[0]?.message ?? "Manifest non valido.", keys: [] };
    return { manifest: r.data, keys: collectClipKeys(r.data) };
  }, [manifestText]);

  const counts = useMemo(() => {
    const m = parsed.manifest;
    if (!m) return null;
    const lessons = m.modules.flatMap((x) => x.lessons);
    return {
      modules: m.modules.length,
      lessons: lessons.length,
      slides: lessons.flatMap((l) => l.slides).length,
    };
  }, [parsed.manifest]);

  const missingKeys = parsed.keys.filter((k) => !files[k]);
  const canCreate = !!parsed.manifest && parsed.keys.length > 0 && missingKeys.length === 0 && !creating;

  function onSelectFiles(list: FileList | null) {
    if (!list) return;
    const next = { ...files };
    for (const f of Array.from(list)) next[fileStem(f.name)] = f;
    setFiles(next);
  }

  async function uploadOne(key: string): Promise<ClipInfo> {
    setClips((c) => ({ ...c, [key]: { phase: "uploading", progress: 0 } }));
    const res = await fetch("/api/staff/clips/direct-upload", { method: "POST" });
    if (!res.ok) throw new Error(`Direct upload non autorizzato/fallito (${res.status}).`);
    const { uid, uploadURL } = (await res.json()) as { uid: string; uploadURL: string };
    await uploadWithProgress(uploadURL, files[key], (p) =>
      setClips((c) => ({ ...c, [key]: { phase: "uploading", progress: p } })),
    );
    setClips((c) => ({ ...c, [key]: { phase: "processing", progress: 1 } }));
    for (let i = 0; i < 80; i++) {
      const s = (await (await fetch(`/api/staff/clips/${uid}/status`)).json()) as {
        ready: boolean;
        duration: number;
        errored: boolean;
      };
      if (s.errored) throw new Error("processing della clip fallito");
      if (s.ready) {
        setClips((c) => ({ ...c, [key]: { phase: "ready", progress: 1 } }));
        return { uid, duration: s.duration };
      }
      await sleep(3000);
    }
    throw new Error("timeout nel processing della clip");
  }

  async function create() {
    if (!parsed.manifest) return;
    setCreating(true);
    setError("");
    try {
      const clipMap: Record<string, ClipInfo> = {};
      for (const key of parsed.keys) {
        try {
          clipMap[key] = await uploadOne(key);
        } catch (e) {
          setClips((c) => ({ ...c, [key]: { phase: "error", progress: 0, error: String(e) } }));
          throw new Error(`Clip "${key}": ${e instanceof Error ? e.message : e}`);
        }
      }
      const out = await createCourseFromManifest(parsed.manifest, clipMap);
      setResult(out);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creazione non riuscita.");
    } finally {
      setCreating(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-heading text-xl text-near-black">Corso creato e pubblicato</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">È nel catalogo globale e assegnabile dalle aziende.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/staff/corsi" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110">
            Torna ai corsi
          </Link>
          <Link href={`/catalogo/${result.courseId}`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-near-black transition hover:bg-secondary/40">
            Vedi nel catalogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      {/* 1 — Manifest */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <FileJson className="h-4 w-4 text-primary" />
          <h2 className="font-medium text-near-black">1 · Manifest del corso</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          JSON con struttura, slide (HTML + <code>clipKey</code>) e quiz. Le ore = <code>requiredMinutes</code> (monte-ore legale).
        </p>
        <textarea
          value={manifestText}
          onChange={(e) => setManifestText(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder='{ "title": "…", "requiredMinutes": 240, "modules": [ … ] }'
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none ring-primary/30 focus:ring-2"
        />
        {parsed.error ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {parsed.error}
          </p>
        ) : parsed.manifest && counts ? (
          <p className="mt-2 text-sm text-near-black">
            <span className="font-medium">{parsed.manifest.title}</span>
            <span className="text-muted-foreground">
              {" "}· {counts.modules} moduli · {counts.lessons} lezioni · {counts.slides} slide ·{" "}
              {Math.round(parsed.manifest.requiredMinutes / 60) || "<1"} ore · {parsed.keys.length} clip
            </span>
          </p>
        ) : null}
      </section>

      {/* 2 — Clip */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <UploadCloud className="h-4 w-4 text-primary" />
          <h2 className="font-medium text-near-black">2 · Clip avatar (mp4)</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Seleziona gli mp4: il nome (senza estensione) deve combaciare con la <code>clipKey</code> (es. <code>s01.mp4</code>).
        </p>
        <input
          type="file"
          accept="video/mp4"
          multiple
          onChange={(e) => onSelectFiles(e.target.files)}
          disabled={!parsed.manifest}
          className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-near-black hover:file:bg-secondary/70 disabled:opacity-50"
        />
        {parsed.keys.length > 0 ? (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {parsed.keys.map((k) => {
              const st = clips[k];
              const matched = !!files[k];
              return (
                <li key={k} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-1.5 text-xs">
                  <span className="font-mono text-near-black">{k}</span>
                  {st?.phase === "ready" ? (
                    <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> pronta</span>
                  ) : st?.phase === "uploading" ? (
                    <span className="text-primary">upload {Math.round(st.progress * 100)}%</span>
                  ) : st?.phase === "processing" ? (
                    <span className="inline-flex items-center gap-1 text-primary"><Loader2 className="h-3.5 w-3.5 animate-spin" /> processing</span>
                  ) : st?.phase === "error" ? (
                    <span className="text-destructive">errore</span>
                  ) : matched ? (
                    <span className="text-muted-foreground">{fileStem(files[k].name)}.mp4</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle className="h-3.5 w-3.5" /> manca</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {/* 3 — Crea */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {missingKeys.length > 0 && parsed.manifest
            ? `${missingKeys.length} clip ancora da abbinare.`
            : parsed.manifest
              ? "Pronto: l'upload e la creazione sono atomici."
              : "Incolla un manifest valido per iniziare."}
        </p>
        <button
          onClick={create}
          disabled={!canCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          Carica e crea corso
        </button>
      </div>
    </div>
  );
}
