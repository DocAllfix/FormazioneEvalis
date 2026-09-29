import Login from "@/components/pages/Login";
import { pathInterno } from "@/lib/next-sicuro";

export const metadata = { title: "Accedi — Evalis" };

// `next` letto e validato lato server: il form lo usa dopo l'accesso e lo passa al link
// "Registrati", così chi non ha ancora un account non perde la destinazione.
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <Login next={next ? pathInterno(next, "") || null : null} />;
}
