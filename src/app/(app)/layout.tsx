import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";
import { getNavContext } from "@/features/admin/context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { SupportChatWidget } from "@/components/support/chat/support-chat-widget";
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
  if (!ctx) redirect("/login");

  const nav = await getNavContext({ id: ctx.user.id, email: ctx.user.email });

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
      <SupportChatWidget enabled={azureConfigured} />
    </SidebarProvider>
  );
}
