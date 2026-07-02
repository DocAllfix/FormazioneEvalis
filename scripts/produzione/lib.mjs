// Libreria condivisa del toolkit di produzione corsi (Node).
// Convenzioni: un corso = una cartella produzione/<corso>/ ; ID slide canonico
// `<corso>_mNN_sNNN` = chiave copioni = nome wav = nome mp4 = clipKey = chiave clip-map.
// PRODUZIONE_ROOT (env) permette di puntare a una root alternativa (dry-run/test).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const ROOT = process.env.PRODUZIONE_ROOT || "produzione";

export const ID_RE = /^[a-z0-9]+_m\d{2}_s\d{3}$/;

export function dirs(corso) {
  const base = path.join(ROOT, corso);
  return {
    base,
    audio: path.join(base, "audio"),
    clips: path.join(base, "clips"),
    shards: path.join(base, "shards"),
    copioni: path.join(base, "copioni.json"),
    glossario: path.join(base, "glossario-tts.json"),
    audioMap: path.join(base, "audio-map.json"),
    clipMap: path.join(base, "clip-map.json"),
    qaReport: path.join(base, "qa-report.json"),
    manifest: path.join(base, "manifest.json"),
  };
}

export function readJson(file, fallback) {
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`File mancante: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const FFPROBE = process.env.FFPROBE || "ffprobe";

/** Durata media (secondi, 3 decimali) via ffprobe. Lancia se il file è illeggibile. */
export function probeDuration(file) {
  const out = execFileSync(
    FFPROBE,
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  ).trim();
  const d = Number(out);
  if (!Number.isFinite(d) || d <= 0) throw new Error(`ffprobe: durata non valida per ${file}: "${out}"`);
  return Math.round(d * 1000) / 1000;
}

/** Info stream video: { frames, width, height } (frames può richiedere -count_packets). */
export function probeVideo(file) {
  const out = execFileSync(
    FFPROBE,
    [
      "-v", "error", "-select_streams", "v:0", "-count_packets",
      "-show_entries", "stream=width,height,nb_read_packets", "-of", "csv=p=0", file,
    ],
    { encoding: "utf8" },
  ).trim();
  if (!out) throw new Error(`ffprobe: nessuno stream video in ${file}`);
  const [width, height, frames] = out.split(",").map(Number);
  return { width, height, frames };
}

/** Tag `comment` nei metadati del container (barriera anti-mescolamento #2). */
export function probeComment(file) {
  try {
    return execFileSync(
      FFPROBE,
      ["-v", "error", "-show_entries", "format_tags=comment", "-of", "csv=p=0", file],
      { encoding: "utf8" },
    ).trim();
  } catch {
    return "";
  }
}

/** ID slide del corso, in ordine, dal copioni.json. */
export function slideIds(copioni) {
  return copioni.slides.map((s) => {
    if (!ID_RE.test(s.id)) throw new Error(`ID slide non canonico: "${s.id}"`);
    return s.id;
  });
}
