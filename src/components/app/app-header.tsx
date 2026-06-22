"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const titles: Record<string, string> = {
  "/dashboard": "I miei percorsi",
  "/certificati": "Certificati",
  "/profilo": "Profilo",
};

export function AppHeader() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Evalis";
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <span className="text-sm font-medium text-near-black">{title}</span>
    </header>
  );
}
