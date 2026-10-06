// Prima di partire verso Sentry, ogni evento (errori, transazioni, briciole di navigazione)
// viene ripulito dalle credenziali negli indirizzi: token di reset, token di verifica email,
// identificativo dell'invito. Gli indirizzi stanno in molti campi (request.url, transaction,
// descrizioni degli span, dati delle briciole): invece di inseguirli uno a uno si ripulisce
// ogni testo che contiene un indizio di credenziale. Usato da client, server ed edge.

const INDIZIO = /token=|accept-invitation\/|reset-password\//;

function ripulisciTesto(s: string): string {
  return s
    .replace(/(^|[?&])token=[^&#\s"']*/g, "$1token=[filtrato]")
    .replace(/\/accept-invitation\/[^/?#\s"']+/g, "/accept-invitation/[id]")
    .replace(/\/reset-password\/[^/?#\s"']+/g, "/reset-password/[token]");
}

function cammina<T>(v: T, profondita: number): T {
  if (typeof v === "string") return (INDIZIO.test(v) ? ripulisciTesto(v) : v) as T;
  if (profondita > 8 || v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) {
    // query string in forma di coppie [["token", "…"], ["x", "1"]]
    if (v.length === 2 && v[0] === "token" && typeof v[1] === "string") v[1] = "[filtrato]";
    for (let i = 0; i < v.length; i++) v[i] = cammina(v[i], profondita + 1);
    return v;
  }
  const o = v as Record<string, unknown>;
  for (const k of Object.keys(o)) o[k] = k === "token" && typeof o[k] === "string" ? "[filtrato]" : cammina(o[k], profondita + 1);
  return v;
}

/** Ripulisce un evento Sentry (o una briciola) sul posto e lo restituisce. */
export function ripulisciPerSentry<T>(evento: T): T {
  return cammina(evento, 0);
}
