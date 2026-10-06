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

  it("non modifica l'evento sul posto e non si rompe su proprietà in sola lettura (errore Sentry 06/10)", () => {
    const interno = {};
    Object.defineProperty(interno, "$", { get: () => "/reimposta-password?token=SEGRETO7", enumerable: true });
    const congelato = Object.freeze({ url: "/accept-invitation/inv_SEGRETO8" });
    class Span {
      description = "GET /x?token=SEGRETO9";
    }
    const span = new Span();
    const evento = { request: { url: "/reimposta-password?token=SEGRETO1" }, interno, congelato, span };
    let fuori: typeof evento | undefined;
    expect(() => {
      fuori = ripulisciPerSentry(evento);
    }).not.toThrow();
    const testo = JSON.stringify({ r: fuori!.request, i: fuori!.interno, c: fuori!.congelato });
    expect(testo).not.toContain("SEGRETO1");
    expect(testo).not.toContain("SEGRETO7");
    expect(testo).not.toContain("SEGRETO8");
    // l'originale resta intatto
    expect(evento.request.url).toContain("SEGRETO1");
    // gli oggetti non semplici (istanze di classi Sentry) restano gli stessi
    expect(fuori!.span).toBe(span);
  });

  it("ripulisce la query string anche in forma di coppie o di oggetto", () => {
    const coppie = JSON.stringify(ripulisciPerSentry({ request: { query_string: [["token", "SEGRETO5"], ["x", "1"]] } }));
    const oggetto = JSON.stringify(ripulisciPerSentry({ request: { query_string: { token: "SEGRETO6", x: "1" } } }));
    expect(coppie).not.toContain("SEGRETO5");
    expect(oggetto).not.toContain("SEGRETO6");
    expect(coppie + oggetto).toContain('"x"');
  });
});
