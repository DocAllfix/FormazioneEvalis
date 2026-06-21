// Test della logica PURA dello Step 2 (no DB, no env): estrazione sottodominio,
// validazione slug, serializzazione metadata org. I test di integrazione (signup→org,
// seat, sessione singola) richiedono un DB di test e sono gestiti a parte.

import { describe, it, expect } from "vitest";
import {
  extractSubdomain,
  isValidSlug,
  isReservedSubdomain,
} from "../lib/reserved-subdomains";
import {
  serializeOrgMetadata,
  parseOrgMetadata,
} from "../features/auth/org-metadata";

describe("extractSubdomain", () => {
  it("estrae il sottodominio in dev (*.localhost)", () => {
    expect(extractSubdomain("azienda.localhost", "localhost:3000")).toBe("azienda");
  });
  it("ritorna null sul dominio radice", () => {
    expect(extractSubdomain("localhost:3000", "localhost:3000")).toBeNull();
    expect(extractSubdomain("dominio.com", "dominio.com")).toBeNull();
    expect(extractSubdomain("www.dominio.com", "dominio.com")).toBeNull();
  });
  it("estrae il sottodominio in prod", () => {
    expect(extractSubdomain("azienda.dominio.com", "dominio.com")).toBe("azienda");
  });
  it("ritorna null senza host", () => {
    expect(extractSubdomain(null, "dominio.com")).toBeNull();
  });
});

describe("isValidSlug / isReservedSubdomain", () => {
  it("accetta slug validi", () => {
    expect(isValidSlug("azienda")).toBe(true);
    expect(isValidSlug("good-name")).toBe(true);
    expect(isValidSlug("ab")).toBe(true);
  });
  it("rifiuta slug non validi o riservati", () => {
    expect(isValidSlug("a")).toBe(false); // troppo corto
    expect(isValidSlug("Azienda")).toBe(false); // maiuscole
    expect(isValidSlug("-bad")).toBe(false); // trattino al bordo
    expect(isValidSlug("www")).toBe(false); // riservato
  });
  it("riconosce i riservati", () => {
    expect(isReservedSubdomain("app")).toBe(true);
    expect(isReservedSubdomain("azienda")).toBe(false);
  });
});

describe("org metadata", () => {
  it("serializza e ri-parsa (roundtrip)", () => {
    const raw = serializeOrgMetadata({ type: "company", seatLimit: 5 });
    expect(parseOrgMetadata(raw)).toEqual({ type: "company", seatLimit: 5 });
  });
  it("ritorna null su input invalido", () => {
    expect(parseOrgMetadata(null)).toBeNull();
    expect(parseOrgMetadata("non-json")).toBeNull();
    expect(parseOrgMetadata(JSON.stringify({ type: "x", seatLimit: 5 }))).toBeNull();
  });
});
