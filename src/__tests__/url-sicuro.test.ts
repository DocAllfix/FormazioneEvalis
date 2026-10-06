import { describe, expect, it } from "vitest";
import { paginaConCredenziali } from "@/lib/url-sicuro";

describe("paginaConCredenziali", () => {
  it("riconosce le pagine con credenziali nell'indirizzo", () => {
    expect(paginaConCredenziali("/reimposta-password")).toBe(true);
    expect(paginaConCredenziali("/accept-invitation/inv_1")).toBe(true);
  });

  it("le altre pagine no", () => {
    expect(paginaConCredenziali("/catalogo")).toBe(false);
    expect(paginaConCredenziali("/")).toBe(false);
    expect(paginaConCredenziali("/reimposta-password-altro")).toBe(false);
    expect(paginaConCredenziali("/recupera-password")).toBe(false);
  });
});
