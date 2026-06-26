"use client";

// Sidebar discente. Mostra link condizionali "Area azienda" (se l'utente amministra
// un'azienda) e "Area staff" (se è staff piattaforma). Struttura dal SidebarShell.

import { Award, BookOpen, Building2, GraduationCap, LifeBuoy, MessagesSquare, ShieldCheck } from "lucide-react";
import { SidebarShell, type NavGroup } from "./sidebar-shell";

export function AppSidebar({
  user,
  isStaff = false,
  companyOrg = null,
}: {
  user: { name?: string | null; email: string };
  isStaff?: boolean;
  companyOrg?: { id: string; name: string } | null;
}) {
  const groups: NavGroup[] = [
    {
      label: "Area personale",
      items: [
        { title: "I miei percorsi", url: "/dashboard", icon: GraduationCap },
        { title: "Catalogo", url: "/corsi", icon: BookOpen },
        { title: "Certificati", url: "/certificati", icon: Award },
        { title: "Forum", url: "/forum", icon: MessagesSquare },
        { title: "Assistenza", url: "/assistenza", icon: LifeBuoy },
      ],
    },
  ];

  const alt: NavGroup["items"] = [];
  if (companyOrg) alt.push({ title: "Area azienda", url: "/admin", icon: Building2 });
  if (isStaff) alt.push({ title: "Area staff", url: "/staff/certificati", icon: ShieldCheck });
  if (alt.length) groups.push({ label: "Gestione", items: alt });

  return <SidebarShell brand={{ initial: "E", name: "Evalis" }} groups={groups} user={user} />;
}
