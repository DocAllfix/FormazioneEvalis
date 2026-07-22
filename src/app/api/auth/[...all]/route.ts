// Route handler better-auth: espone tutti gli endpoint di auth/organizzazione
// sotto /api/auth/* (signup, login, logout, inviti, org, ...). Modulo 1.
//
// C-1 (audit go-live): rate limiting per IP sulle azioni sensibili (brute-force login,
// signup-bomb, reset-bomb). Il GET (sessione, ecc.) non è limitato. Fail-open sul DB del limiter.

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { checkLimit, getClientIp, tooManyRequests } from "@/lib/security/rate-limit";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

const MIN = 60_000;

export async function POST(req: Request) {
  const path = new URL(req.url).pathname;
  const ip = getClientIp(req);

  let ok = true;
  let windowMs = 5 * MIN;
  if (path.includes("/sign-in")) {
    windowMs = 5 * MIN;
    ok = await checkLimit(`auth:signin:${ip}`, 10, windowMs); // 10 tentativi / 5 min
  } else if (path.includes("/sign-up")) {
    windowMs = 60 * MIN;
    ok = await checkLimit(`auth:signup:${ip}`, 5, windowMs); // 5 registrazioni / ora
  } else if (path.includes("/forget-password") || path.includes("/request-password-reset") || path.includes("/reset-password")) {
    windowMs = 60 * MIN;
    ok = await checkLimit(`auth:reset:${ip}`, 5, windowMs); // 5 reset / ora
  }
  if (!ok) return tooManyRequests(windowMs);

  return handler.POST(req);
}
