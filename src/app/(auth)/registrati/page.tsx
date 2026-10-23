import Register from "@/components/pages/Register";
import { pathInterno } from "@/lib/next-sicuro";

export const metadata = { title: "Registrati — Evalis" };

// `partner`: il codice del partner dal link (es. /registrati?partner=NGR), che precompila il campo.
// `next`: dove riportare l'utente a registrazione conclusa (es. la scheda del corso di cui ha
// cliccato il prezzo in landing). Letto qui lato server e validato, così il form lo riceve già
// pulito e può usarlo anche nei link senza passare da useSearchParams.
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; partner?: string }> }) {
  const { next, partner } = await searchParams;
  // solo lettere e cifre, corto: è un precompilato, la validazione vera la fa la registrazione
  const codice = typeof partner === "string" && /^[A-Za-z0-9]{1,20}$/.test(partner) ? partner.toUpperCase() : null;
  return <Register next={next ? pathInterno(next, "") || null : null} partner={codice} />;
}
