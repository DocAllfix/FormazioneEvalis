import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { pathInterno } from "@/lib/next-sicuro";
import { getCurrentSession } from "@/lib/auth/server";
import { getNavContext } from "@/features/admin/context";
import { needsOnboarding } from "@/features/onboarding/state";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { LazySupportChat } from "@/components/support/chat/lazy-support-chat";
import { azureConfigured } from "@/lib/ai/azure";

// Shell discente con sidebar (adattata da dashboard-starter). Server Component:
// gate sessione (better-auth) → /login se assente. Mostra link condizionali area
// azienda/staff in base ai ruoli dell'utente.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentSession();
  if (!ctx) {
    // dopo il login si torna alla pagina richiesta (es. i Certificati dal pulsante della mail che
    // chiede l'opinione); l'indirizzo arriva dal proxy e passa dal controllo anti-redirect, come
    // nel layout dello staff
    const dove = pathInterno((await headers()).get("x-percorso"), "");
    redirect(dove ? `/login?next=${encodeURIComponent(dove)}` : "/login");
  }

  const nav = await getNavContext({
    id: ctx.user.id,
    email: ctx.user.email,
    platformRole: (ctx.user as { platformRole?: string | null }).platformRole,
  });

  // Gate onboarding: i discenti al primo accesso vanno al wizard finché non lo completano/saltano.
  // Lo staff di piattaforma è esente (niente rumore per l'uso interno).
  if (!nav.isStaff && (await needsOnboarding(ctx.user.id))) {
    redirect("/onboarding");
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: ctx.user.name, email: ctx.user.email }}
        isStaff={nav.isStaff}
        companyOrg={nav.companyOrg ? { id: nav.companyOrg.id, name: nav.companyOrg.name } : null}
      />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
      <LazySupportChat enabled={azureConfigured} />
    </SidebarProvider>
  );
}
