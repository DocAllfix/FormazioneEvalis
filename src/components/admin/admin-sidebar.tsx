"use client";

// Sidebar area AZIENDA (B2B). Owner/admin gestiscono persone, abbonamento, panoramica.

import { CreditCard, LayoutDashboard, LogIn, Users } from "lucide-react";
import { SidebarShell, type NavGroup } from "@/components/app/sidebar-shell";

export function AdminSidebar({
  user,
  companyName,
}: {
  user: { name?: string | null; email: string };
  companyName: string;
}) {
  const groups: NavGroup[] = [
    {
      label: "Azienda",
      items: [
        { title: "Panoramica", url: "/admin", icon: LayoutDashboard },
        { title: "Persone", url: "/admin/persone", icon: Users },
        { title: "Abbonamento", url: "/admin/billing", icon: CreditCard },
      ],
    },
    {
      label: "Altro",
      items: [{ title: "Area personale", url: "/dashboard", icon: LogIn }],
    },
  ];

  const initial = (companyName.trim()[0] || "A").toUpperCase();
  return <SidebarShell brand={{ initial, name: companyName }} groups={groups} user={user} />;
}
