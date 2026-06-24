"use client";

// Sidebar console ADMIN PIATTAFORMA (Evalis): catalogo corsi, certificati, team.

import { Award, BookPlus, LogIn, Users } from "lucide-react";
import { SidebarShell, type NavGroup } from "@/components/app/sidebar-shell";

export function StaffSidebar({ user }: { user: { name?: string | null; email: string } }) {
  const groups: NavGroup[] = [
    {
      label: "Admin piattaforma",
      items: [
        { title: "Corsi", url: "/staff/corsi", icon: BookPlus },
        { title: "Certificati", url: "/staff/certificati", icon: Award },
        { title: "Team", url: "/staff/team", icon: Users },
      ],
    },
    {
      label: "Altro",
      items: [{ title: "Area personale", url: "/dashboard", icon: LogIn }],
    },
  ];
  return <SidebarShell brand={{ initial: "E", name: "Evalis Admin" }} groups={groups} user={user} />;
}
