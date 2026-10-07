import { beforeEach, describe, expect, it, vi } from "vitest";

// La mail al committente porta a /staff/certificati?q=<numero>. Chi la apre senza essere
// collegato deve arrivare al login e, dopo l'accesso, tornare a QUEL certificato — non a una
// pagina d'errore (errore Sentry del 07/10: "Non autenticato." su questa pagina).
const sessione = vi.hoisted(() => ({ ctx: null as null | { user: { id: string; email: string; platformRole?: string | null } } }));
const listCertificatiStaff = vi.hoisted(() => vi.fn(async () => []));

vi.mock("@/lib/auth/server", () => ({ getCurrentSession: async () => sessione.ctx }));
vi.mock("@/features/certificates/lifecycle", () => ({ listCertificatiStaff }));
vi.mock("@/components/admin/cert-review-list", () => ({ CertReviewList: () => null }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

import Pagina from "@/app/(staff)/staff/certificati/page";

const apri = (sp: { q?: string; stato?: string }) => Pagina({ searchParams: Promise.resolve(sp) });

beforeEach(() => listCertificatiStaff.mockClear());

describe("pagina /staff/certificati", () => {
  it("senza accesso: va al login e ricorda il certificato cercato; non legge nulla", async () => {
    sessione.ctx = null;
    await expect(apri({ q: "EVALIS-2026-FA0074EA" })).rejects.toThrow(
      `REDIRECT /login?next=${encodeURIComponent("/staff/certificati?q=EVALIS-2026-FA0074EA")}`,
    );
    await expect(apri({ q: "Rossi", stato: "attesa" })).rejects.toThrow(
      `REDIRECT /login?next=${encodeURIComponent("/staff/certificati?q=Rossi&stato=attesa")}`,
    );
    await expect(apri({})).rejects.toThrow(`REDIRECT /login?next=${encodeURIComponent("/staff/certificati")}`);
    expect(listCertificatiStaff).not.toHaveBeenCalled();
  });

  it("collegato ma non staff: torna alla dashboard; non legge nulla", async () => {
    sessione.ctx = { user: { id: "u1", email: "discente@example.test", platformRole: null } };
    await expect(apri({ q: "EVALIS-2026-FA0074EA" })).rejects.toThrow("REDIRECT /dashboard");
    expect(listCertificatiStaff).not.toHaveBeenCalled();
  });

  it("staff: legge l'elenco con la ricerca richiesta", async () => {
    sessione.ctx = { user: { id: "u2", email: "staff@example.test", platformRole: "admin" } };
    await apri({ q: "EVALIS-2026-FA0074EA" });
    expect(listCertificatiStaff).toHaveBeenCalledWith({ q: "EVALIS-2026-FA0074EA", stato: "tutti" });
  });
});
