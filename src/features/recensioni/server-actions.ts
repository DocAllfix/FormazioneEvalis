"use server";

// Server Actions delle recensioni: sessione + wrapper sottili sulla logica di recensioni.ts.
// Dopo ogni scrittura si invalida il tag «recensioni»: medie e opinioni del sito si aggiornano.

import { updateTag } from "next/cache";
import { requireSession } from "@/features/auth/guards";
import { conEsito } from "@/lib/esito";
import { moderaRecensione, salvaRecensione, type AzioneModerazione } from "./recensioni";

/** L'utente salva la sua opinione su un corso che ha completato. */
export async function salvaMiaRecensioneAction(enrollmentId: string, input: unknown) {
  return conEsito(async () => {
    const { user } = await requireSession();
    const r = await salvaRecensione(user.id, enrollmentId, input);
    updateTag("recensioni");
    return r;
  });
}

/** Staff: approva, mette o toglie dalla landing, nasconde. */
export async function moderaRecensioneAction(id: string, azione: AzioneModerazione) {
  return conEsito(async () => {
    const r = await moderaRecensione(id, azione);
    updateTag("recensioni");
    return r;
  });
}
