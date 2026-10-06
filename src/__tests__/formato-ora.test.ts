import { describe, expect, it } from "vitest";
import { oraRoma } from "../lib/formato";

describe("oraRoma", () => {
  it("scrive l'ora di Roma qualunque sia il fuso del server (ora legale e solare)", () => {
    // 6 ottobre: ora legale, UTC+2 → il caso reale del blocco fino alle 12:04
    expect(oraRoma(new Date("2026-10-06T10:04:44.540Z"))).toBe("12:04");
    // gennaio: ora solare, UTC+1
    expect(oraRoma(new Date("2027-01-15T22:30:00Z"))).toBe("23:30");
  });
});
