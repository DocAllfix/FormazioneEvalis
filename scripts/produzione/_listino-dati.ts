// Re-export: la fonte di verità del listino vive in src/features/billing/listino-dati.ts
// (così la importano sia gli script locali sia la route di go-live che gira su Vercel).
export * from "@/features/billing/listino-dati";
