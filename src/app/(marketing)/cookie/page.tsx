import Link from "next/link";
import { LegalShell, H2, P, UL } from "@/components/legal/legal-shell";
import { COMPANY } from "@/lib/legal/company";
import { PreferenzeCookie } from "@/components/legal/preferenze-cookie";

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
        o per memorizzarne le preferenze. Possono essere &quot;tecnici&quot; (necessari al funzionamento) oppure
        di &quot;statistica&quot; e di &quot;profilazione&quot; (per misurare l&apos;uso del sito o per la pubblicità).
      </P>

      <H2>2. Cookie tecnici necessari</H2>
      <P>
        Sono indispensabili al funzionamento del servizio e, ai sensi delle Linee guida del Garante Privacy,{" "}
        <strong>non richiedono il consenso preventivo</strong>.
      </P>
      <UL>
        <li>
          <strong>Sessione e autenticazione</strong> — mantengono l&apos;utente autenticato durante la navigazione
          nell&apos;area riservata. Durata: la sessione, o fino a 30 giorni se si sceglie di restare collegati.
          Titolare: {COMPANY.legalName}.
        </li>
        <li>
          <strong>Sicurezza</strong> — proteggono da accessi non autorizzati e da abusi dei moduli.
          Durata: la sessione. Titolare: {COMPANY.legalName}.
        </li>
        <li>
          <strong>Preferenza sui cookie</strong> — memorizza la scelta espressa con il banner, per non richiederla
          a ogni visita. Durata: 12 mesi. Titolare: {COMPANY.legalName}.
        </li>
      </UL>

      <H2>3. Cookie di statistica (facoltativi, solo con il tuo consenso)</H2>
      <P>
        Se acconsenti, utilizziamo <strong>Google Analytics 4</strong> per capire quali contenuti vengono letti
        e come si naviga il sito. Ci servono a migliorare corsi e articoli, non a riconoscere le persone.
      </P>
      <UL>
        <li><strong>Finalità:</strong> statistica aggregata — pagine viste, provenienza, durata della lettura.</li>
        <li>
          <strong>Terza parte:</strong> Google Ireland Limited. L&apos;indirizzo IP è anonimizzato prima di
          qualsiasi elaborazione.
        </li>
        <li><strong>Durata:</strong> fino a 14 mesi.</li>
        <li>
          <strong>Base giuridica:</strong> il consenso dell&apos;interessato (art. 6.1.a GDPR), revocabile in
          qualsiasi momento.
        </li>
      </UL>
      <P>
        <strong>Finché non acconsenti, questi strumenti non vengono caricati</strong>: dal browser non parte alcuna
        richiesta verso Google. Se rifiuti, il sito funziona esattamente come prima.
      </P>

      <H2>4. Cookie di profilazione e pubblicità</H2>
      <P>
        <strong>Non ne utilizziamo</strong>, e i relativi parametri di consenso restano permanentemente negati.
        Non vendiamo né cediamo dati a fini pubblicitari. Qualora in futuro cambiasse qualcosa, questa informativa
        sarà aggiornata e verrà richiesto un nuovo consenso.
      </P>

      <H2>5. Come esprimere, modificare o revocare il consenso</H2>
      <P>
        Al primo accesso compare un banner con tre possibilità: <strong>Accetta</strong>, <strong>Rifiuta</strong> e{" "}
        <strong>Personalizza</strong>. Rifiutare richiede un solo clic, esattamente come accettare, e nessuna
        casella è pre-selezionata.
      </P>
      <P>
        Si può cambiare idea in qualsiasi momento:{" "}
        <PreferenzeCookie className="font-medium text-primary underline hover:no-underline" />, oppure dal link
        presente in fondo a ogni pagina. La revoca ha effetto immediato.
      </P>
      <P>
        In alternativa si possono gestire o eliminare i cookie dalle impostazioni del browser (Chrome, Firefox,
        Safari, Edge). Attenzione: disattivare i cookie tecnici compromette l&apos;accesso all&apos;area riservata
        e la fruizione dei corsi.
      </P>

      <H2>6. I tuoi diritti</H2>
      <P>
        È possibile chiedere in ogni momento accesso, rettifica, cancellazione, limitazione e portabilità dei dati,
        e opporsi al trattamento. È inoltre riconosciuto il diritto di proporre reclamo al Garante per la protezione
        dei dati personali. Il dettaglio è nella{" "}
        <Link className="text-primary" href="/privacy">Privacy Policy</Link>.
      </P>

      <H2>7. Contatti</H2>
      <P>
        Per qualsiasi richiesta relativa ai cookie o alla privacy:{" "}
        <a className="text-primary" href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
      </P>
    </LegalShell>
  );
}
