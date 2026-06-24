import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";
import { isPlatformStaffEmail } from "@/features/auth/guards";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { StaffSidebar } from "@/components/admin/staff-sidebar";
import { AppHeader } from "@/components/app/app-header";

// Shell area STAFF piattaforma. Gate: sessione + email in allowlist PLATFORM_STAFF_EMAILS.
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCurrentSession();
  if (!ctx) redirect("/login");
  if (!isPlatformStaffEmail(ctx.user.email)) redirect("/dashboard");

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
