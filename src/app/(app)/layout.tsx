import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppHeader } from "@/components/app/app-header";

// Shell discente con sidebar (adattata da dashboard-starter). Server Component:
// gate sessione (better-auth) → /login se assente.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentSession();
  if (!ctx) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar user={{ name: ctx.user.name, email: ctx.user.email }} />
      <SidebarInset>
        <AppHeader />
        <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
