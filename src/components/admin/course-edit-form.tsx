"use client";

// Editor scheda corso (admin): immagine di copertina + campi ricchi (a chi è rivolto,
// obiettivi, livello, lingua, info certificato). Consuma authoring-actions + route immagine.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImageUp, Loader2, Trash2 } from "lucide-react";
import { setCourseDetails, removeCourseImage } from "@/features/courses/authoring-actions";
import type { AdminCourseEdit } from "@/features/courses/admin-catalog";

const LEVELS = ["Base", "Intermedio", "Avanzato"];
const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2";

export function CourseEditForm({ course }: { course: AdminCourseEdit }) {
  const router = useRouter();
  const d = course.details ?? {};
  const [audience, setAudience] = useState(d.audience ?? "");
  const [objectives, setObjectives] = useState((d.objectives ?? []).join("\n"));
  const [level, setLevel] = useState(d.level ?? "");
  const [language, setLanguage] = useState(d.language ?? "Italiano");
  const [certInfo, setCertInfo] = useState(d.certInfo ?? "");
  const [imageUrl, setImageUrl] = useState(course.imageUrl);
  const [saving, setSaving] = useState(false);
  const [busyImg, setBusyImg] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const objs = objectives.split("\n").map((s) => s.trim()).filter(Boolean);
      const details = {
        audience: audience.trim() || undefined,
        objectives: objs.length ? objs : undefined,
        level: level.trim() || undefined,
        language: language.trim() || undefined,
        certInfo: certInfo.trim() || undefined,
      };
      const empty = Object.values(details).every((v) => v === undefined);
      await setCourseDetails(course.id, empty ? null : details);
      setMsg("Scheda salvata.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  }

  async function onImage(file: File | undefined) {
    if (!file) return;
    setBusyImg(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/staff/courses/${course.id}/image`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Upload immagine fallito (${res.status}).`);
      const { imageUrl: url } = (await res.json()) as { imageUrl: string };
      setImageUrl(url);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload immagine fallito.");
    } finally {
      setBusyImg(false);
    }
  }

  async function removeImg() {
    setBusyImg(true);
    try {
      await removeCourseImage(course.id);
      setImageUrl(null);
      router.refresh();
    } finally {
      setBusyImg(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      {/* Immagine di copertina */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium text-near-black">Immagine di copertina</h2>
        <p className="mt-1 text-sm text-muted-foreground">Opzionale. Senza immagine, la scheda usa una grafica per categoria.</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/40">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">nessuna</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-near-black transition hover:bg-secondary/40">
              {busyImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
              Carica immagine
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={busyImg} onChange={(e) => onImage(e.target.files?.[0])} />
            </label>
            {imageUrl ? (
              <button onClick={removeImg} disabled={busyImg} className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" /> Rimuovi
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Scheda corso */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-medium text-near-black">Scheda corso (catalogo)</h2>
        <div>
          <label className="text-sm font-medium text-near-black">A chi è rivolto</label>
          <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="es. Professionisti che vogliono certificarsi come Auditor ISO 14064" className={`mt-1.5 ${field}`} />
        </div>
        <div>
          <label className="text-sm font-medium text-near-black">Obiettivi di apprendimento <span className="font-normal text-muted-foreground">(uno per riga)</span></label>
          <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={4} placeholder={"Comprendere la struttura della norma\nQuantificare le emissioni di gas serra\n…"} className={`mt-1.5 ${field}`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-near-black">Livello</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className={`mt-1.5 ${field}`}>
              <option value="">— non specificato</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-near-black">Lingua</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} className={`mt-1.5 ${field}`} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-near-black">Cosa attesta il certificato</label>
          <textarea value={certInfo} onChange={(e) => setCertInfo(e.target.value)} rows={3} placeholder="es. Attesta le competenze di Auditor secondo lo schema CERTIS. Certificato verificabile con QR e codice univoco." className={`mt-1.5 ${field}`} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salva scheda
          </button>
          {msg ? <span className="text-sm text-success">{msg}</span> : null}
        </div>
      </section>
    </div>
  );
}
