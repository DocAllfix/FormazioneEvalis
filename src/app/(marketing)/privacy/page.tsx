import Link from "next/link";
import { LegalShell, H2, P, UL } from "@/components/legal/legal-shell";
import { COMPANY, SUBPROCESSORS } from "@/lib/legal/company";

export const metadata = {
  title: "Privacy Policy — Evalis Academy",
  description: "Informativa sul trattamento dei dati personali della piattaforma Evalis Academy, ai sensi del Reg. UE 2016/679 (GDPR).",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated={COMPANY.lastUpdated}>
      <P>
        La presente informativa descrive le modalità di trattamento dei dati personali degli utenti che
        utilizzano la piattaforma di formazione <strong>{COMPANY.brand}</strong> ({COMPANY.site}), ai sensi
        dell&apos;art. 13 del Regolamento (UE) 2016/679 (&quot;GDPR&quot;) e della normativa italiana applicabile.
      </P>

      <H2>1. Titolare del trattamento</H2>
      <P>
        Il Titolare del trattamento è <strong>{COMPANY.legalName}</strong>, con sede legale in {COMPANY.address} —
        P.IVA/C.F. {COMPANY.vat}, REA {COMPANY.rea}. Contatti: {COMPANY.email} · PEC {COMPANY.pec} · tel. {COMPANY.phone}.
        Per le richieste in materia di protezione dei dati: <a className="text-primary" href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
        Non è nominato un Responsabile della protezione dei dati (DPO).
      </P>

      <H2>2. Ruolo del Titolare (utenti privati e aziende)</H2>
      <UL>
        <li><strong>Utenti privati (B2C):</strong> {COMPANY.legalName} agisce come Titolare del trattamento dei dati dell&apos;utente che acquista e fruisce i corsi.</li>
        <li><strong>Dipendenti di aziende clienti (B2B):</strong> quando un&apos;azienda iscrive i propri dipendenti, l&apos;azienda cliente è Titolare del trattamento dei dati dei propri dipendenti ed {COMPANY.legalName} agisce come Responsabile del trattamento per suo conto, sulla base di apposito accordo (DPA).</li>
      </UL>

      <H2>3. Categorie di dati trattati</H2>
      <UL>
        <li><strong>Dati di account:</strong> nome, indirizzo email, credenziali di accesso (password conservata in forma cifrata).</li>
        <li><strong>Dati di fruizione e apprendimento:</strong> tempi di visione delle lezioni, progressione, tentativi ed esiti dei quiz, attestati. Questi dati sono tracciati in forma non alterabile per finalità di conformità normativa (es. Accordo Stato-Regioni).</li>
        <li><strong>Dati di pagamento:</strong> gestiti direttamente dal fornitore Stripe; {COMPANY.legalName} non conserva i dati completi delle carte.</li>
        <li><strong>Dati tecnici:</strong> indirizzo IP, log di accesso, tipo di dispositivo/browser, per sicurezza e corretto funzionamento.</li>
        <li><strong>Interazioni con l&apos;assistente virtuale:</strong> i messaggi inviati al chatbot di supporto.</li>
      </UL>

      <H2>4. Finalità e basi giuridiche</H2>
      <UL>
        <li>Erogazione dei corsi, gestione dell&apos;account e rilascio degli attestati — <em>esecuzione del contratto</em> (art. 6.1.b).</li>
        <li>Tracciamento della fruizione e conservazione degli esiti — <em>obbligo legale</em> e <em>esecuzione del contratto</em> (art. 6.1.b/c).</li>
        <li>Gestione dei pagamenti, fatturazione e adempimenti fiscali — <em>obbligo legale</em> (art. 6.1.c).</li>
        <li>Sicurezza della piattaforma e prevenzione degli abusi — <em>legittimo interesse</em> (art. 6.1.f).</li>
        <li>Comunicazioni di servizio (email transazionali) — <em>esecuzione del contratto</em>.</li>
      </UL>

      <H2>5. Periodo di conservazione</H2>
      <P>
        I dati sono conservati per il tempo strettamente necessario alle finalità indicate. I dati relativi agli
        attestati e alla tracciabilità della fruizione sono conservati per <strong>almeno 10 anni</strong>, come
        previsto dalla normativa di settore. I dati di account sono conservati per la durata del rapporto e successivamente
        cancellati o anonimizzati, salvo obblighi di legge.
      </P>

      <H2>6. Destinatari e responsabili esterni</H2>
      <P>
        Per l&apos;erogazione del servizio ci avvaliamo di fornitori che trattano i dati come Responsabili, nel rispetto del GDPR:
      </P>
      <UL>
        {SUBPROCESSORS.map((s) => (
          <li key={s.name}><strong>{s.name}</strong> — {s.role} ({s.region}).</li>
        ))}
      </UL>
      <P>
        I dati possono inoltre essere comunicati ad autorità competenti e a consulenti/professionisti per obblighi di legge.
      </P>

      <H2>7. Trasferimenti extra-UE</H2>
      <P>
        Database, autenticazione ed email sono ospitati nell&apos;Unione Europea. Ove taluni fornitori comportino trasferimenti
        verso Paesi terzi, questi avvengono sulla base di garanzie adeguate (Clausole Contrattuali Standard della Commissione UE).
      </P>

      <H2>8. Diritti dell&apos;interessato</H2>
      <P>
        L&apos;utente può esercitare in ogni momento i diritti di accesso, rettifica, cancellazione, limitazione, portabilità,
        opposizione e revoca del consenso, scrivendo a <a className="text-primary" href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
        È inoltre possibile proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).
      </P>

      <H2>9. Cookie</H2>
      <P>
        Per le informazioni sui cookie utilizzati dalla piattaforma si rinvia alla <Link className="text-primary" href="/cookie">Cookie Policy</Link>.
      </P>

      <H2>10. Modifiche</H2>
      <P>
        La presente informativa può essere aggiornata. Le modifiche saranno pubblicate su questa pagina con indicazione della data di ultimo aggiornamento.
      </P>
    </LegalShell>
  );
}
