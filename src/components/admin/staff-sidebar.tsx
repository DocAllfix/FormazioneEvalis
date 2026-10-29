"use client";

// Sidebar console ADMIN PIATTAFORMA (Evalis): catalogo corsi, certificati, recensioni, team.

import { Award, BookPlus, LifeBuoy, LogIn, MessageSquareHeart, Users } from "lucide-react";
import { SidebarShell, type NavGroup } from "@/components/app/sidebar-shell";

export function StaffSidebar({ user }: { user: { name?: string | null; email: string } }) {
  const groups: NavGroup[] = [
    {
      label: "Admin piattaforma",
      items: [
        { title: "Corsi", url: "/staff/corsi", icon: BookPlus },
        { title: "Certificati", url: "/staff/certificati", icon: Award },
        { title: "Recensioni", url: "/staff/recensioni", icon: MessageSquareHeart },
        { title: "Ticket", url: "/staff/ticket", icon: LifeBuoy },
        { title: "Team", url: "/staff/team", icon: Users },
      ],
    },
    {
      label: "Altro",
      items: [{ title: "Area personale", url: "/dashboard", icon: LogIn }],
    },
  ];
  return (
    <SidebarShell
      brand={{ initial: "E", name: "Evalis Admin", mark: "/brand/monogram.png" }}
      groups={groups}
      user={user}
    />
  );
}
