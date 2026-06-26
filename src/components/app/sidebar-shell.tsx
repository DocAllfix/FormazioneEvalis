"use client";

// Shell di sidebar riusabile per le tre aree (discente / azienda / staff). Header brand,
// gruppi nav configurabili, eventuale gruppo "cambia area", footer utente con logout.
// Una sola struttura → niente duplicazione tra le shell. Auth = better-auth.

// Link di next-view-transitions: anima il cambio sezione (crossfade nativo del browser,
// fallback istantaneo dove l'API non c'è). Drop-in di next/link.
import { Link } from "next-view-transitions";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, User, type LucideIcon } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NavItem = { title: string; url: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export function SidebarShell({
  brand,
  groups,
  user,
}: {
  brand: { initial: string; name: string; mark?: string };
  groups: NavGroup[];
  user: { name?: string | null; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon" data-tour="app-sidebar">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          {brand.mark ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.mark}
              alt={brand.name}
              className="h-8 w-8 shrink-0 object-contain"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-white">
              {brand.initial}
            </span>
          )}
          <span className="font-heading text-lg text-near-black group-data-[collapsible=icon]:hidden">
            {brand.name}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-medium text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium text-near-black">
                      {user.name || "Account"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-near-black">
                      {user.name || "Account"}
                    </span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profilo">
                    <User className="mr-2 h-4 w-4" />
                    Profilo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
