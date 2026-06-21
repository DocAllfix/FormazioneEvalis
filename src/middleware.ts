// Middleware multi-tenant (pattern vercel/platforms, reimplementato).
// Gira su Edge: NON tocca il DB (postgres-js non è Edge-safe). Estrae solo il
// sottodominio dall'Host e lo propaga come header `x-org-slug`. La risoluzione
// slug→org (con cache) avviene lato Node in src/features/auth/tenant.ts.

import { NextResponse, type NextRequest } from "next/server";
import { extractSubdomain, isReservedSubdomain } from "@/lib/reserved-subdomains";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export function middleware(req: NextRequest) {
  const sub = extractSubdomain(req.headers.get("host"), ROOT_DOMAIN);
  const requestHeaders = new Headers(req.headers);

  if (sub && !isReservedSubdomain(sub)) {
    requestHeaders.set("x-org-slug", sub); // contesto azienda (B2B)
  } else {
    requestHeaders.delete("x-org-slug"); // dominio principale (B2C/marketing)
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Esclude asset statici e gli endpoint auth (gestiscono i propri cookie same-origin).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
