// Registro tour: pattern URL → starter. Singolo punto di estensione (aggiungi un tour =
// registra qui). Adattato a Next: il path arriva da usePathname (vedi HelpButton/AutoTour).
// Il primo match (ordine) vince.

import type { Driver } from "driver.js";
import { resetTour } from "./config";
import { startDashboardTour } from "./tours/dashboard";
import { startCorsiTour } from "./tours/corsi";

export type TourStarter = () => Driver | null;

export interface TourRegistryEntry {
  pageId: string;
  pathPattern: RegExp;
  start: TourStarter;
  label: string;
}

export const TOUR_REGISTRY: TourRegistryEntry[] = [
  { pageId: "corsi", pathPattern: /^\/corsi\/?$/, start: startCorsiTour, label: "Catalogo" },
  { pageId: "dashboard", pathPattern: /^\/dashboard\/?$/, start: startDashboardTour, label: "I miei percorsi" },
];

export function findTourForPath(pathname: string): TourRegistryEntry | null {
  for (const entry of TOUR_REGISTRY) if (entry.pathPattern.test(pathname)) return entry;
  return null;
}

/** Reset flag localStorage + rilancia (usato dal "?": l'utente forza il revisit). */
export function restartTourForPath(pathname: string): boolean {
  const entry = findTourForPath(pathname);
  if (!entry) return false;
  resetTour(entry.pageId);
  entry.start();
  return true;
}
