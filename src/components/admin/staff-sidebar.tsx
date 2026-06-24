"use client";

// Sidebar area STAFF piattaforma (ente accreditato): revisione/emissione certificati.

import { Award, LogIn } from "lucide-react";
import { SidebarShell, type NavGroup } from "@/components/app/sidebar-shell";

export function StaffSidebar({ user }: { user: { name?: string | null; email: string } }) {
  const groups: NavGroup[] = [
    {
      label: "Staff piattaforma",
      items: [{ title: "Certificati", url: "/staff/certificati", icon: Award }],
    },
    {
      label: "Altro",
      items: [{ title: "Area personale", url: "/dashboard", icon: LogIn }],
    },
  ];
  return <SidebarShell brand={{ initial: "E", name: "Evalis Staff" }} groups={groups} user={user} />;
}
