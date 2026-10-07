import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { pathInterno } from "@/lib/next-sicuro";
import { getCurrentSession } from "@/lib/auth/server";
import { isPlatformAdmin } from "@/features/auth/guards";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { StaffSidebar } from "@/components/admin/staff-sidebar";
import { AppHeader } from "@/components/app/app-header";

// Shell console ADMIN PIATTAFORMA (Evalis). Gate: sessione + ruolo platformRole='admin'
// (o allowlist email come bootstrap).
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentSession();
  if (!ctx) {
    // dopo il login si torna alla pagina richiesta (es. il certificato del pulsante nella mail
    // al committente); l'indirizzo arriva dal proxy e passa comunque dal controllo anti-redirect
    const dove = pathInterno((await headers()).get("x-percorso"), "");
    redirect(dove ? `/login?next=${encodeURIComponent(dove)}` : "/login");
  }
  if (!isPlatformAdmin(ctx.user as { email: string; platformRole?: string | null })) redirect("/dashboard");

  return (
    <SidebarProvider>
      <StaffSidebar user={{ name: ctx.user.name, email: ctx.user.email }} />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
