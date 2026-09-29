import Register from "@/components/pages/Register";
import { pathInterno } from "@/lib/next-sicuro";

export const metadata = { title: "Registrati — Evalis" };

// `next`: dove riportare l'utente a registrazione conclusa (es. la scheda del corso di cui ha
// cliccato il prezzo in landing). Letto qui lato server e validato, così il form lo riceve già
// pulito e può usarlo anche nei link senza passare da useSearchParams.
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <Register next={next ? pathInterno(next, "") || null : null} />;
}
