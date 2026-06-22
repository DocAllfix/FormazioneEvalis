"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadMyCertificate } from "@/features/learner/server-actions";

export function CertificateDownloadButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const url = await downloadMyCertificate(id);
      window.open(url, "_blank", "noopener");
    } catch {
      // gestione errore (toast) in fase successiva
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Scarica PDF
    </button>
  );
}
