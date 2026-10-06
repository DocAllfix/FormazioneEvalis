import { describe, expect, it, vi } from "vitest";

// La coda staff espone nome ed email dei discenti di tutti i tenant: il controllo deve stare
// nella pagina, perché il redirect del layout non impedisce che la pagina venga eseguita.
const requirePlatformAdmin = vi.fn();
const listStaffQueue = vi.fn(async () => []);

vi.mock("@/features/auth/guards", () => ({ requirePlatformAdmin }));
vi.mock("@/features/support/lifecycle", () => ({ listStaffQueue }));
vi.mock("@/components/admin/reindex-kb-button", () => ({ ReindexKbButton: () => null }));

describe("pagina /staff/ticket", () => {
  it("senza admin di piattaforma non legge la coda", async () => {
    requirePlatformAdmin.mockRejectedValueOnce(new Error("Permesso negato"));
    const { default: Pagina } = await import("@/app/(staff)/staff/ticket/page");
    await expect(Pagina()).rejects.toThrow("Permesso negato");
    expect(listStaffQueue).not.toHaveBeenCalled();
  });

  it("con admin di piattaforma legge la coda", async () => {
    requirePlatformAdmin.mockResolvedValueOnce({ user: { id: "u1" } });
    const { default: Pagina } = await import("@/app/(staff)/staff/ticket/page");
    await Pagina();
    expect(listStaffQueue).toHaveBeenCalledTimes(1);
  });
});
