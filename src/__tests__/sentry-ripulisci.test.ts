import { describe, expect, it } from "vitest";
import { ripulisciPerSentry } from "@/lib/sentry-ripulisci";

describe("ripulisciPerSentry", () => {
  it("toglie token e id invito da tutti i campi di un evento", () => {
    const evento = {
      message: "Errore qualsiasi",
      transaction: "GET /reimposta-password?token=SEGRETO1",
      request: {
        url: "https://evalisacademy.it/reimposta-password?token=SEGRETO1&x=1",
        query_string: "token=SEGRETO1&x=1",
      },
      breadcrumbs: [
        { category: "navigation", data: { from: "/login", to: "/accept-invitation/inv_SEGRETO2" } },
        { category: "fetch", data: { url: "/api/auth/reset-password/SEGRETO3?callbackURL=%2Freimposta-password" } },
      ],
      spans: [{ description: "GET https://evalisacademy.it/api/auth/verify-email?token=SEGRETO4" }],
    };
    const fuori = JSON.stringify(ripulisciPerSentry(evento));
    for (const s of ["SEGRETO1", "SEGRETO2", "SEGRETO3", "SEGRETO4"]) expect(fuori).not.toContain(s);
    expect(fuori).toContain("x=1");
    expect(fuori).toContain("Errore qualsiasi");
    expect(fuori).toContain("/login");
  });

  it("lascia identico un evento senza credenziali", () => {
    const evento = { request: { url: "https://evalisacademy.it/catalogo?c=iso" }, tags: { a: 1 }, extra: null };
    expect(ripulisciPerSentry(structuredClone(evento))).toEqual(evento);
  });

  it("ripulisce la query string anche in forma di coppie o di oggetto", () => {
    const coppie = JSON.stringify(ripulisciPerSentry({ request: { query_string: [["token", "SEGRETO5"], ["x", "1"]] } }));
    const oggetto = JSON.stringify(ripulisciPerSentry({ request: { query_string: { token: "SEGRETO6", x: "1" } } }));
    expect(coppie).not.toContain("SEGRETO5");
    expect(oggetto).not.toContain("SEGRETO6");
    expect(coppie + oggetto).toContain('"x"');
  });
});
