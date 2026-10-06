// Pagine che portano un segreto nell'indirizzo: il reset password (`?token=`, vale un'ora e basta a
// cambiare la password) e l'accettazione dell'invito (`/accept-invitation/<id>`). Su queste pagine
// Google Analytics non si carica, così il segreto non finisce nei suoi dati. Funzione pura.

const PAGINE_CON_CREDENZIALI = [/^\/reimposta-password(\/|$)/, /^\/accept-invitation\//];

/** True se il percorso è una pagina che porta credenziali nell'indirizzo. */
export function paginaConCredenziali(pathname: string): boolean {
  return PAGINE_CON_CREDENZIALI.some((r) => r.test(pathname));
}
