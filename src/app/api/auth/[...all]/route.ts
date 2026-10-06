// Route handler better-auth: espone tutti gli endpoint di auth/organizzazione
// sotto /api/auth/* (signup, login, logout, inviti, org, ...). Modulo 1.
//
// C-1 (audit go-live): rate limiting per IP sulle azioni sensibili (brute-force login,
// signup-bomb, reset-bomb). Il GET (sessione, ecc.) non è limitato. Fail-open sul DB del limiter.

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { checkLimit, getClientIp, tooManyRequests } from "@/lib/security/rate-limit";
import { pathInterno } from "@/lib/next-sicuro";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

const MIN = 60_000;

// Soglie: i valori di PRODUZIONE sono i default qui sotto e restano invariati se le env non
// sono impostate. Si alzano solo dove serve — in CI l'intera suite e2e arriva da un IP unico e
// consumerebbe il budget a metà — senza dover disattivare il controllo (un interruttore
// "spegni il rate limit" sarebbe una scorciatoia pericolosa da dimenticare accesa).
function soglia(nome: string, predefinito: number): number {
  const v = Number(process.env[nome]);
  return Number.isFinite(v) && v > 0 ? v : predefinito;
}

export async function POST(req: Request) {
  const path = new URL(req.url).pathname;
  const ip = getClientIp(req);

  let ok = true;
  let windowMs = 5 * MIN;
  if (path.includes("/sign-in")) {
    windowMs = 5 * MIN;
    ok = await checkLimit(`auth:signin:${ip}`, soglia("RATE_LIMIT_SIGNIN", 10), windowMs); // 10 tentativi / 5 min
  } else if (path.includes("/sign-up")) {
    windowMs = 60 * MIN;
    ok = await checkLimit(`auth:signup:${ip}`, soglia("RATE_LIMIT_SIGNUP", 5), windowMs); // 5 registrazioni / ora
  } else if (path.includes("/forget-password") || path.includes("/request-password-reset") || path.includes("/reset-password")) {
    windowMs = 60 * MIN;
    ok = await checkLimit(`auth:reset:${ip}`, soglia("RATE_LIMIT_RESET", 5), windowMs); // 5 reset / ora
  }
  if (!ok) return tooManyRequests(windowMs);

  // Il token di reset deve arrivare solo alla NOSTRA pagina. better-auth accetta come destinazione
  // qualunque origine fidata, compresi i sottodomini `*.root` (che servono al login aziendale): chi
  // chiede il reset potrebbe così far atterrare il token su un sottodominio che non controlliamo.
  // Il nostro modulo manda sempre un percorso interno; qualunque altra cosa viene rifiutata.
  if (path.endsWith("/request-password-reset")) {
    const corpo = (await req.clone().json().catch(() => null)) as { redirectTo?: unknown } | null;
    const dest = corpo?.redirectTo;
    if (dest !== undefined && (typeof dest !== "string" || pathInterno(dest, "") === "")) {
      return new Response("destinazione non valida", { status: 400 });
    }
  }

  return handler.POST(req);
}
