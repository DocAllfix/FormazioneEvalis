// Prima di partire verso Sentry, ogni evento (errori, transazioni, briciole di navigazione)
// viene ripulito dalle credenziali negli indirizzi: token di reset, token di verifica email,
// identificativo dell'invito. Gli indirizzi stanno in molti campi (request.url, transaction,
// descrizioni degli span, dati delle briciole): invece di inseguirli uno a uno si ripulisce
// ogni testo che contiene un indizio di credenziale. Usato da client, server ed edge.
//
// NON modifica l'evento sul posto: alcuni oggetti interni di Sentry hanno proprietà in sola
// lettura (getter) e assegnarle fa fallire l'invio. Si costruisce una copia, scendendo solo in
// oggetti semplici e array; gli altri oggetti restano com'erano.

const INDIZIO = /token=|accept-invitation\/|reset-password\//;

function ripulisciTesto(s: string): string {
  return s
    .replace(/(^|[?&])token=[^&#\s"']*/g, "$1token=[filtrato]")
    .replace(/\/accept-invitation\/[^/?#\s"']+/g, "/accept-invitation/[id]")
    .replace(/\/reset-password\/[^/?#\s"']+/g, "/reset-password/[token]");
}

function oggettoSemplice(v: object): boolean {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function copia(v: unknown, profondita: number): unknown {
  if (typeof v === "string") return INDIZIO.test(v) ? ripulisciTesto(v) : v;
  if (profondita > 8 || v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) {
    // query string in forma di coppie [["token", "…"], ["x", "1"]]
    if (v.length === 2 && v[0] === "token" && typeof v[1] === "string") return ["token", "[filtrato]"];
    return v.map((x) => copia(x, profondita + 1));
  }
  if (!oggettoSemplice(v)) return v;
  const fuori: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    fuori[k] = k === "token" && typeof val === "string" ? "[filtrato]" : copia(val, profondita + 1);
  }
  return fuori;
}

/** Restituisce una copia dell'evento Sentry (o della briciola) senza credenziali negli indirizzi.
 *  Non lancia mai: in caso di problemi l'evento parte com'era, invece di andare perso. */
export function ripulisciPerSentry<T>(evento: T): T {
  try {
    return copia(evento, 0) as T;
  } catch {
    return evento;
  }
}
