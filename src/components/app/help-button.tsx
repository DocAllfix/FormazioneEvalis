"use client";

// "?" globale (AppHeader): rilancia il tour della pagina corrente. Render condizionale:
// se la pagina non ha un tour registrato, il bottone non appare. Inoltre, al PRIMO accesso
// a una pagina con tour, lo avvia in automatico una volta (guard localStorage).
//
// Eccezione: se si arriva su un punto preciso della pagina (ancora nell'URL, es. il pacchetto
// cliccato in landing, /corsi#pacchetto-qualita) il tour NON parte da solo: coprirebbe proprio
// quello che l'utente è venuto a comprare. Non viene segnato come visto, quindi comparirà alla
// visita successiva; e il "?" resta disponibile.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import "@/lib/tour/overrides.css";
import { findTourForPath, restartTourForPath } from "@/lib/tour/registry";
import { isTourDone, markTourDone } from "@/lib/tour/config";

export function HelpButton() {
  const pathname = usePathname();
  const entry = findTourForPath(pathname);

  useEffect(() => {
    if (!entry) return;
    if (isTourDone(entry.pageId)) return;
    if (window.location.hash) return; // arrivato su un punto preciso: niente tour sopra
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      markTourDone(entry.pageId);
      return;
    }
    // Attende il mount degli elementi target (skeleton risolti) prima di avviare.
    const t = setTimeout(() => entry.start(), 900);
    return () => clearTimeout(t);
  }, [entry]);

  if (!entry) return null;

  return (
    <button
      type="button"
      data-tour="help-button"
      onClick={() => restartTourForPath(pathname)}
      aria-label={`Rivedi il tour: ${entry.label}`}
      title="Rivedi il tour della pagina"
      className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-near-black"
    >
      <HelpCircle className="h-4.5 w-4.5" />
    </button>
  );
}
