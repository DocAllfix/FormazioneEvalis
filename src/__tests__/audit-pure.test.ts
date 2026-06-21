// Test puri del hashing audit: determinismo, canonicalizzazione chiavi, sensibilità.

import { describe, it, expect } from "vitest";
import { canonicalJson, computeHash } from "../features/audit/hash";

const base = {
  prevHash: null,
  organizationId: "org-1",
  userId: "user-1",
  verb: "completed",
  object: "slide:1",
  payload: { b: 2, a: 1 },
  createdAtISO: "2026-01-01T00:00:00.000Z",
};

describe("audit hash", () => {
  it("è deterministico", () => {
    expect(computeHash(base)).toBe(computeHash(base));
  });

  it("canonicalizza l'ordine delle chiavi del payload", () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
    expect(computeHash({ ...base, payload: { a: 1, b: 2 } })).toBe(
      computeHash({ ...base, payload: { b: 2, a: 1 } }),
    );
  });

  it("cambia se cambia un qualsiasi campo", () => {
    expect(computeHash({ ...base, verb: "failed" })).not.toBe(computeHash(base));
    expect(computeHash({ ...base, prevHash: "abc" })).not.toBe(computeHash(base));
    expect(computeHash({ ...base, object: "slide:2" })).not.toBe(computeHash(base));
    expect(computeHash({ ...base, payload: { a: 1, b: 3 } })).not.toBe(computeHash(base));
  });
});
