// Test puri Modulo 10: builder PDF (bytes validi + QR) e allowlist staff piattaforma.

import { describe, it, expect, beforeEach } from "vitest";
import { buildCertificatePdf } from "../features/certificates/pdf";
import { isPlatformStaffEmail } from "../features/auth/guards";

describe("buildCertificatePdf", () => {
  it("produce un PDF valido e non banale (QR embeddato)", async () => {
    const bytes = await buildCertificatePdf({
      learnerName: "Mario Rossi",
      courseTitle: "Sicurezza base",
      issuedAt: new Date("2026-06-21T10:00:00Z"),
      number: "EVALIS-2026-ABCD1234",
      verifyUrl: "https://example.test/verify/abcd",
    });
    const header = Buffer.from(bytes.slice(0, 5)).toString("latin1");
    expect(header).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1500); // contiene il QR come immagine
  });
});

describe("isPlatformStaffEmail", () => {
  beforeEach(() => {
    process.env.PLATFORM_STAFF_EMAILS = "Staff@Evalis.it, altro@evalis.it";
  });

  it("riconosce lo staff (case-insensitive) e rifiuta il resto", () => {
    expect(isPlatformStaffEmail("staff@evalis.it")).toBe(true);
    expect(isPlatformStaffEmail("  STAFF@evalis.it ")).toBe(true);
    expect(isPlatformStaffEmail("intruso@evalis.it")).toBe(false);
  });

  it("vuoto/non configurato → false", () => {
    process.env.PLATFORM_STAFF_EMAILS = "";
    expect(isPlatformStaffEmail("staff@evalis.it")).toBe(false);
  });
});
