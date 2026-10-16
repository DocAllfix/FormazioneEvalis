import { beforeEach, describe, expect, it, vi } from "vitest";

// Next esegue layout e pagina in parallelo: il redirect del layout non ferma la pagina. Senza sessione
// le pagine protette leggevano comunque i dati e lanciavano «Non autenticato.» (errore Sentry del
// 16/10/2026 su /dashboard). Ora controllano la sessione PRIMA di leggere: login e ritorno alla pagina.
const sessione = vi.hoisted(() => ({ ctx: null as null | { user: { id: string; email: string; platformRole?: string | null } } }));
const percorso = vi.hoisted(() => ({ valore: "/dashboard" }));
const letture = vi.hoisted(() => ({ dashboard: vi.fn(async () => []), staff: vi.fn(async () => []) }));

vi.mock("@/lib/auth/server", () => ({ getCurrentSession: async () => sessione.ctx }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-percorso": percorso.valore }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/features/learner/queries", () => ({ getMyEnrollments: letture.dashboard, getMyCertificates: letture.dashboard }));
vi.mock("@/features/courses/admin-catalog", () => ({ listGlobalCoursesForAdmin: letture.staff }));
vi.mock("@/components/admin/admin-course-list", () => ({ AdminCourseList: () => null }));

import Dashboard from "@/app/(app)/dashboard/page";
import StaffCorsi from "@/app/(staff)/staff/corsi/page";

beforeEach(() => {
  letture.dashboard.mockClear();
  letture.staff.mockClear();
});

describe("pagine protette senza sessione", () => {
  it("/dashboard: va al login, ricorda la pagina e non legge nulla", async () => {
    sessione.ctx = null;
    percorso.valore = "/dashboard?purchase=success";
    await expect(Dashboard()).rejects.toThrow(`REDIRECT /login?next=${encodeURIComponent("/dashboard?purchase=success")}`);
    expect(letture.dashboard).not.toHaveBeenCalled();
  });

  it("un indirizzo esterno non viene mai usato come ritorno", async () => {
    sessione.ctx = null;
    percorso.valore = "//sito-malevolo.example/x";
    await expect(Dashboard()).rejects.toThrow("REDIRECT /login");
    await expect(Dashboard()).rejects.not.toThrow("sito-malevolo");
  });

  it("console staff: senza sessione al login, utente normale alla dashboard, staff entra", async () => {
    percorso.valore = "/staff/corsi";
    sessione.ctx = null;
    await expect(StaffCorsi()).rejects.toThrow(`REDIRECT /login?next=${encodeURIComponent("/staff/corsi")}`);
    sessione.ctx = { user: { id: "u1", email: "corsista@example.test", platformRole: null } };
    await expect(StaffCorsi()).rejects.toThrow("REDIRECT /dashboard");
    expect(letture.staff).not.toHaveBeenCalled();
    sessione.ctx = { user: { id: "s1", email: "staff@example.test", platformRole: "admin" } };
    await expect(StaffCorsi()).resolves.toBeTruthy();
    expect(letture.staff).toHaveBeenCalledTimes(1);
  });
});
