// Checkpoint NON retroattivi. Fino al 06/10/2026 l'ingest salvava la posizione del checkpoint
// come indice della lezione DENTRO il modulo (sempre 0, un modulo = una lezione), mentre il
// player la legge come indice della lezione nel CORSO: si vedeva solo il checkpoint del
// modulo 1. Corretti i dati (migrazione 0032), chi aveva già superato quel punto del percorso
// senza che il checkpoint gli fosse mai proposto non deve vederselo chiedere a posteriori.
//
// Regola: il checkpoint dopo la lezione `posizione` non blocca se, PRIMA di CORREZIONE_CHECKPOINT,
// lo studente aveva già completato una slide di una lezione successiva oppure iniziato l'esame
// finale. Chi arriva a quel punto dopo la correzione lo fa come tutti gli altri.

export const CORREZIONE_CHECKPOINT = new Date("2026-10-06T14:00:00Z");

export function checkpointNonRetroattivo(
  posizione: number,
  slideCompletate: { indiceLezione: number; completedAt: Date | null }[],
  esameFinaleIniziatoIl: Date | null,
  correzione: Date = CORREZIONE_CHECKPOINT,
): boolean {
  if (esameFinaleIniziatoIl && esameFinaleIniziatoIl < correzione) return true;
  return slideCompletate.some(
    (s) => s.indiceLezione > posizione && s.completedAt !== null && s.completedAt < correzione,
  );
}
