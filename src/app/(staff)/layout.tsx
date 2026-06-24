import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";
import { isPlatformAdmin } from "@/features/auth/guards";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { StaffSidebar } from "@/components/admin/staff-sidebar";
import { AppHeader } from "@/components/app/app-header";

// Shell console ADMIN PIATTAFORMA (Evalis). Gate: sessione + ruolo platformRole='admin'
// (o allowlist email come bootstrap).
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentSession();
  if (!ctx) redirect("/login");
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
