import { describe, it, expect } from "vitest";
import { isPlayerReviewerId } from "@/features/auth/guards";

describe("isPlayerReviewerId — bypass skip revisore (solo allowlist)", () => {
  it("dilonardoa28 (allowlist) → true", () => {
    expect(isPlayerReviewerId("UDehVYvTyFwHEBmVH1rWQwvLU5yjEF40")).toBe(true);
  });
  it("un utente qualsiasi → false (gating normale)", () => {
    expect(isPlayerReviewerId("qualsiasi-altro-user-id")).toBe(false);
  });
  it("id assente/null → false", () => {
    expect(isPlayerReviewerId(undefined)).toBe(false);
    expect(isPlayerReviewerId(null)).toBe(false);
    expect(isPlayerReviewerId("")).toBe(false);
  });
  it("estendibile via env PLAYER_REVIEWER_USER_IDS", () => {
    process.env.PLAYER_REVIEWER_USER_IDS = "abc, def";
    expect(isPlayerReviewerId("def")).toBe(true);
    expect(isPlayerReviewerId("ghi")).toBe(false);
    delete process.env.PLAYER_REVIEWER_USER_IDS;
  });
});
