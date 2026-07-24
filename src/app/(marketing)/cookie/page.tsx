import Link from "next/link";
import { LegalShell, H2, P, UL } from "@/components/legal/legal-shell";
import { COMPANY } from "@/lib/legal/company";

export const metadata = {
  title: "Cookie Policy — Evalis Academy",
  description: "Informativa sui cookie utilizzati dalla piattaforma Evalis Academy.",
};

export default function CookiePage() {
  return (
    <LegalShell title="Cookie Policy" updated={COMPANY.lastUpdated}>
      <P>
        La presente Cookie Policy descrive i cookie e le tecnologie simili utilizzati dalla piattaforma{" "}
        <strong>{COMPANY.brand}</strong> ({COMPANY.site}). Titolare del trattamento è {COMPANY.legalName}
        (v. <Link className="text-primary" href="/privacy">Privacy Policy</Link>).
      </P>

      <H2>1. Cosa sono i cookie</H2>
      <P>
        I cookie sono piccoli file di testo che i siti salvano sul dispositivo dell&apos;utente per farlo funzionare
        o per memorizzarne le preferenze. Possono essere &quot;tecnici&quot; (necessari) oppure &quot;di profilazione&quot;
        (per analisi statistiche o pubblicità).
      </P>

      <H2>2. Cookie utilizzati da questa piattaforma</H2>
      <P>
        <strong>Utilizziamo esclusivamente cookie tecnici necessari</strong> al funzionamento del servizio. In particolare:
      </P>
      <UL>
        <li><strong>Cookie di sessione e autenticazione:</strong> mantengono l&apos;utente autenticato e la sessione sicura durante la navigazione nell&apos;area riservata.</li>
        <li><strong>Cookie di sicurezza:</strong> proteggono da accessi non autorizzati e abusi.</li>
      </UL>
      <P>
        Questi cookie sono indispensabili e, ai sensi delle Linee guida del Garante Privacy, <strong>non richiedono
        il consenso preventivo</strong> dell&apos;utente. Un breve avviso informativo è mostrato al primo accesso.
      </P>

      <H2>3. Cookie di profilazione, analitici e di terze parti</H2>
      <P>
        Attualmente la piattaforma <strong>non utilizza</strong> cookie di profilazione, cookie di marketing né strumenti
        di analisi di terze parti (es. Google Analytics). Qualora in futuro venissero introdotti, questa informativa sarà
        aggiornata e verrà richiesto il consenso tramite apposito banner con possibilità di scelta granulare.
      </P>

      <H2>4. Gestione e disattivazione</H2>
      <P>
        L&apos;utente può in ogni momento gestire o eliminare i cookie dalle impostazioni del proprio browser
        (Chrome, Firefox, Safari, Edge). La disattivazione dei cookie tecnici può compromettere l&apos;accesso all&apos;area
        riservata e la fruizione dei corsi.
      </P>

      <H2>5. Contatti</H2>
      <P>
        Per qualsiasi richiesta relativa ai cookie o alla privacy: <a className="text-primary" href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
      </P>
    </LegalShell>
  );
}
