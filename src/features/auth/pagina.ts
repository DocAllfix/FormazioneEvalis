// Controllo di sessione per le PAGINE protette (server component).
// Il redirect del layout non basta: Next esegue layout e pagina in parallelo, quindi la pagina
// legge i dati anche quando il layout sta già mandando al login. Senza sessione quelle letture
// lanciano «Non autenticato.» e Sentry lo registra come errore (16/10/2026 su /dashboard, 07/10 su
// /staff/certificati), anche se l'utente finisce correttamente al login. Ogni pagina che legge dati
// chiama prima una di queste funzioni: senza sessione porta al login e, dopo l'accesso, riporta alla
// pagina richiesta (indirizzo dal proxy, x-percorso, ricontrollato contro i redirect esterni).
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { pathInterno } from "@/lib/next-sicuro";
import { getCurrentSession } from "@/lib/auth/server";
import { isPlatformAdmin } from "./guards";

export async function sessionePagina() {
  const ctx = await getCurrentSession();
  if (!ctx) {
    const dove = pathInterno((await headers()).get("x-percorso"), "");
    redirect(dove ? `/login?next=${encodeURIComponent(dove)}` : "/login");
  }
  return ctx;
}

/** Console staff: come sopra, e chi è collegato ma non è dello staff torna alla sua dashboard. */
export async function sessioneStaffPagina() {
  const ctx = await sessionePagina();
  if (!isPlatformAdmin(ctx.user as { email: string; platformRole?: string | null })) redirect("/dashboard");
  return ctx;
}
