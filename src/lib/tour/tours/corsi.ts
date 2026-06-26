import type { Driver, DriveStep } from "driver.js";
import { buildTour } from "../config";

const steps: DriveStep[] = [
  {
    element: '[data-tour="catalog"]',
    popover: {
      title: "Il catalogo delle certificazioni",
      description:
        "Sfoglia i percorsi disponibili: ogni scheda mostra ore, programma ed esame. Scegli quello giusto per te.",
      side: "top",
      align: "start",
    },
  },
  {
    element: '[data-tour="app-sidebar"]',
    popover: {
      title: "Torna quando vuoi",
      description: "Trovi sempre il Catalogo nella barra laterale, insieme a percorsi, certificati e assistenza.",
      side: "right",
      align: "start",
    },
  },
];

export function startCorsiTour(): Driver {
  const tour = buildTour("corsi", steps);
  tour.drive();
  return tour;
}
