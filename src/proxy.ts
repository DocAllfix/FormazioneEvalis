// Proxy multi-tenant (ex-`middleware`, rinominato in Next 16). Runtime Node.
// Estrae SOLO il sottodominio dall'Host e lo propaga come header `x-org-slug`
// (niente DB: la risoluzione slug→org con cache è lato Node in features/auth/tenant.ts).
// Logica identica al precedente middleware; cambia solo il nome della convenzione.

import { NextResponse, type NextRequest } from "next/server";
import { extractSubdomain, isReservedSubdomain } from "@/lib/reserved-subdomains";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

export function proxy(req: NextRequest) {
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
