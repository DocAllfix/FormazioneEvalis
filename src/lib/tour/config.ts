// Tour guidati (Fase 7) — base driver.js, brand Ambra. Porting dell'architettura EduVault:
// factory buildTour + tracking localStorage (signal "già visto" locale: zero round-trip DB,
// zero migration; chi cambia browser lo rivede, preferibile a non rivederlo mai). Spotlight
// animato + popover shadcn-style (override in overrides.css, scoped via popoverClass).

import { driver as createDriver, type Config, type Driver, type DriveStep, type DriverHook } from "driver.js";

const TOUR_PREFIX = "evalis-tour:";
const BANNER_PREFIX = "evalis-banner:";

export const tourStorageKey = (pageId: string) => `${TOUR_PREFIX}${pageId}`;
export const bannerStorageKey = (pageId: string) => `${BANNER_PREFIX}${pageId}`;

export function isTourDone(pageId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(tourStorageKey(pageId)) === "1";
}
export function markTourDone(pageId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tourStorageKey(pageId), "1");
}
export function resetTour(pageId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(tourStorageKey(pageId));
}
export function isBannerSeen(pageId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(bannerStorageKey(pageId)) === "1";
}
export function markBannerSeen(pageId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(bannerStorageKey(pageId), "1");
}

const BASE_CONFIG: Partial<Config> = {
  showProgress: true,
  allowClose: true,
  smoothScroll: true,
  disableActiveInteraction: true,
  stagePadding: 8,
  stageRadius: 10,
  popoverClass: "evalis-popover",
  overlayColor: "rgb(28 18 6 / 0.55)",
  nextBtnText: "Avanti →",
  prevBtnText: "← Indietro",
  doneBtnText: "Fatto",
  // driver.js v1.4: la X non si wira da sola al destroy → lo registriamo esplicito.
  onCloseClick: (_el, _step, opts) => opts.driver.destroy(),
};

/** Crea un driver con la config base + steps. Qualsiasi chiusura marca il tour come visto. */
export function buildTour(pageId: string, steps: DriveStep[], extra?: Partial<Config>): Driver {
  const onDestroyStarted: DriverHook = (element, step, opts) => {
    markTourDone(pageId);
    extra?.onDestroyStarted?.(element, step, opts);
  };
  return createDriver({ ...BASE_CONFIG, ...extra, steps, onDestroyStarted });
}
