import { describe, expect, it, vi, beforeEach } from "vitest";

// Il token di reset deve arrivare solo alla nostra pagina: chi chiede il reset non può scegliere
// una destinazione esterna (un sottodominio, un altro sito). Il controllo sta nel gestore delle
// rotte /api/auth, prima di better-auth.
const chiamato = vi.fn(async (_req: Request) => new Response("ok", { status: 200 }));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({ GET: vi.fn(), POST: chiamato }),
}));
vi.mock("@/lib/auth", () => ({ auth: {} }));
vi.mock("@/lib/security/rate-limit", () => ({
  checkLimit: vi.fn(async () => true),
  getClientIp: () => "127.0.0.1",
  tooManyRequests: () => new Response("troppe", { status: 429 }),
}));

const URL_RESET = "http://localhost:3100/api/auth/request-password-reset";

function richiesta(corpo: unknown) {
  return new Request(URL_RESET, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

describe("POST /api/auth/request-password-reset — destinazione del link", () => {
  beforeEach(() => chiamato.mockClear());

  it.each([
    ["sottodominio", "https://cms.evalisacademy.it/qualsiasi"],
    ["senza protocollo", "//evil.example/x"],
    ["barra rovescia", "/\\evil.example/x"],
    ["carattere di controllo", "/\t/evil.example/x"],
    ["schema javascript", "javascript:alert(1)"],
    ["non stringa", 123],
  ])("rifiuta una destinazione esterna (%s) senza chiamare better-auth", async (_n, redirectTo) => {
    const { POST } = await import("@/app/api/auth/[...all]/route");
    const r = await POST(richiesta({ email: "x@example.test", redirectTo }));
    expect(r.status).toBe(400);
    expect(chiamato).not.toHaveBeenCalled();
  });

  it("accetta la nostra pagina interna", async () => {
    const { POST } = await import("@/app/api/auth/[...all]/route");
    const r = await POST(richiesta({ email: "x@example.test", redirectTo: "/reimposta-password" }));
    expect(r.status).toBe(200);
    expect(chiamato).toHaveBeenCalledTimes(1);
  });

  it("lascia passare la richiesta senza destinazione (default di better-auth)", async () => {
    const { POST } = await import("@/app/api/auth/[...all]/route");
    const r = await POST(richiesta({ email: "x@example.test" }));
    expect(r.status).toBe(200);
    expect(chiamato).toHaveBeenCalledTimes(1);
  });

  it("il corpo resta leggibile da better-auth dopo il controllo", async () => {
    chiamato.mockImplementationOnce(async (req: Request) => new Response(JSON.stringify(await req.json()), { status: 200 }));
    const { POST } = await import("@/app/api/auth/[...all]/route");
    const r = await POST(richiesta({ email: "x@example.test", redirectTo: "/reimposta-password" }));
    expect(await r.json()).toEqual({ email: "x@example.test", redirectTo: "/reimposta-password" });
  });
});
