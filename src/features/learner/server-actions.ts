"use server";

// Server Actions invocabili dai Client Components della piattaforma discente.
// Wrapper sottili su funzioni gate-ate (sessione + ownership applicate dentro).

import { getCertificateDownloadUrl } from "@/features/certificates/lifecycle";
import { leggiAnagrafica, anagraficaBloccata, salvaAnagrafica } from "@/features/certificates/anagrafica";
import { requireSession } from "@/features/auth/guards";
import {
  getMyClipUrl,
  startMyQuiz,
  submitMyQuiz,
  requestMyCertificate,
} from "@/features/learner/actions";
import { QuizNonDisponibile } from "@/features/quiz/engine";
import { conEsito } from "@/lib/esito";

/** URL firmato (TTL breve) del PDF certificato: solo proprietario o staff. */
export async function downloadMyCertificate(certificateId: string): Promise<string> {
  return getCertificateDownloadUrl(certificateId);
}

/** URL HLS firmato (TTL breve) della clip avatar di una slide del MIO corso. */
export async function getMyClipUrlAction(
  enrollmentId: string,
  slideId: string,
): Promise<string> {
  return getMyClipUrl(enrollmentId, slideId);
}

/** Avvia un quiz: estrae le domande (senza risposte) + limite di tempo. */
export async function startMyQuizAction(enrollmentId: string, quizId: string) {
  try {
    return { ok: true as const, ...(await startMyQuiz(enrollmentId, quizId)) };
  } catch (e) {
    // blocco previsto (attesa, tentativi esauriti): si restituisce il messaggio, che in produzione
    // un'eccezione perderebbe. Ogni altro errore resta un'eccezione come prima.
    if (e instanceof QuizNonDisponibile) return { ok: false as const, errore: e.message };
    throw e;
  }
}

/** Invia le risposte: correzione/soglia/tempo lato server. */
export async function submitMyQuizAction(
  attemptId: string,
  answers: { questionId: string; optionId: string }[],
) {
  return conEsito(() => submitMyQuiz(attemptId, answers));
}

/** A esame finale superato: predispone il certificato (ready_for_review) se a norma. */
export async function requestMyCertificateAction(enrollmentId: string) {
  return requestMyCertificate(enrollmentId);
}

/** I miei dati per il certificato (codice fiscale, data e luogo di nascita) e se sono bloccati. */
export async function leggiMiaAnagraficaAction() {
  const { user } = await requireSession();
  const [dati, bloccata] = await Promise.all([leggiAnagrafica(user.id), anagraficaBloccata(user.id)]);
  return { dati, bloccata };
}

/** Salva i miei dati per il certificato. Restituisce l'errore invece di lanciarlo: in produzione
 * Next nasconde i messaggi delle eccezioni, e qui l'utente deve leggere cosa correggere. */
export async function salvaMiaAnagraficaAction(input: {
  codiceFiscale: string;
  dataNascita: string;
  luogoNascita: string;
}): Promise<{ ok: true } | { ok: false; errore: string }> {
  const { user } = await requireSession();
  try {
    await salvaAnagrafica(user.id, input);
    return { ok: true };
  } catch (e) {
    return { ok: false, errore: e instanceof Error ? e.message : "Salvataggio non riuscito." };
  }
}
