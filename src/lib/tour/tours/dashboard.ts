import type { Driver, DriveStep } from "driver.js";
import { buildTour } from "../config";

const steps: DriveStep[] = [
  {
    element: '[data-tour="dashboard-stats"]',
    popover: {
      title: "Le tue metriche",
      description:
        "Qui vedi a colpo d’occhio i percorsi attivi, quelli in corso, quelli completati e i certificati ottenuti.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="app-sidebar"]',
    popover: {
      title: "Naviga la piattaforma",
      description:
        "Da qui raggiungi il Catalogo, i Certificati, il Forum e l’Assistenza. Puoi collassare la sidebar dal trigger in alto.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: "Aiuto sempre a portata",
      description: "Clicca il “?” in qualsiasi momento per rivedere il tour della pagina.",
      side: "bottom",
      align: "end",
    },
  },
];

export function startDashboardTour(): Driver {
  const tour = buildTour("dashboard", steps);
  tour.drive();
  return tour;
}
