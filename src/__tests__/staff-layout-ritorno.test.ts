import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Chi apre una pagina staff senza essere collegato va al login e, dopo l'accesso, torna alla
// pagina che aveva chiesto (per esempio il certificato del pulsante nella mail al committente).
// Il controllo generale dell'area staff scatta prima della pagina e da solo non conosce
// l'indirizzo: glielo passa il proxy in un'intestazione che il visitatore non può falsificare.
const sessione = vi.hoisted(() => ({ ctx: null as null | { user: { id: string; email: string; name: string; platformRole?: string | null } } }));
const intestazioni = vi.hoisted(() => ({ percorso: null as string | null }));

vi.mock("@/lib/auth/server", () => ({ getCurrentSession: async () => sessione.ctx }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (k: string) => (k === "x-percorso" ? intestazioni.percorso : null) }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("@/components/ui/sidebar", () => ({ SidebarInset: () => null, SidebarProvider: () => null }));
vi.mock("@/components/admin/staff-sidebar", () => ({ StaffSidebar: () => null }));
vi.mock("@/components/app/app-header", () => ({ AppHeader: () => null }));

import StaffLayout from "@/app/(staff)/layout";
import { proxy } from "@/proxy";

const apri = () => StaffLayout({ children: null });

describe("area staff — ritorno dopo il login", () => {
  it("senza accesso: login con ritorno alla pagina richiesta", async () => {
    sessione.ctx = null;
    intestazioni.percorso = "/staff/certificati?q=EVALIS-2026-FA0074EA";
    await expect(apri()).rejects.toThrow(`REDIRECT /login?next=${encodeURIComponent("/staff/certificati?q=EVALIS-2026-FA0074EA")}`);
  });

  it("indirizzo mancante o non interno: login semplice, mai un sito esterno", async () => {
    sessione.ctx = null;
    for (const p of [null, "//evil.example/x", "https://evil.example", "/\\evil.example"]) {
      intestazioni.percorso = p;
      await expect(apri()).rejects.toThrow(/^REDIRECT \/login$/);
    }
  });

  it("collegato ma non staff: dashboard", async () => {
    sessione.ctx = { user: { id: "u1", email: "discente@example.test", name: "D", platformRole: null } };
    intestazioni.percorso = "/staff/certificati";
    await expect(apri()).rejects.toThrow("REDIRECT /dashboard");
  });
});

describe("proxy — indirizzo richiesto", () => {
  const passata = (url: string, headers: Record<string, string> = {}) => {
    const r = proxy(new NextRequest(url, { headers: { host: new URL(url).host, ...headers } }));
    return r.headers.get("x-middleware-request-x-percorso");
  };

  it("passa alle pagine percorso e ricerca della richiesta", () => {
    expect(passata("https://evalisacademy.it/staff/certificati?q=EVALIS-2026-FA0074EA")).toBe("/staff/certificati?q=EVALIS-2026-FA0074EA");
    expect(passata("https://evalisacademy.it/dashboard")).toBe("/dashboard");
  });

  it("un valore mandato dal visitatore viene sovrascritto", () => {
    expect(passata("https://evalisacademy.it/staff/ticket", { "x-percorso": "/altrove" })).toBe("/staff/ticket");
  });
});
