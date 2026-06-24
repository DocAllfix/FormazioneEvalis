import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";
import { getCompanyAdminOrg } from "@/features/admin/context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AppHeader } from "@/components/app/app-header";
import { CompanyOnboarding } from "@/components/admin/company-onboarding";

// Shell area AZIENDA (B2B). Gate: sessione + org azienda amministrata. Se l'utente non
// ha ancora un'azienda → onboarding self-serve (crea spazio azienda). Le query/azioni
// admin risolvono l'azienda ESPLICITAMENTE (requireCompanyContext), non via org attiva.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentSession();
  if (!ctx) redirect("/login");

  const company = await getCompanyAdminOrg(ctx.user.id);
  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <CompanyOnboarding userName={ctx.user.name} />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar
        user={{ name: ctx.user.name, email: ctx.user.email }}
        companyName={company.name}
      />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
