import { LegalShell, H2, P, UL } from "@/components/legal/legal-shell";
import { COMPANY } from "@/lib/legal/company";

export const metadata = {
  title: "Termini e Condizioni — Evalis Academy",
  description: "Termini e condizioni d'uso e di vendita della piattaforma Evalis Academy.",
};

export default function TerminiPage() {
  return (
    <LegalShell title="Termini e Condizioni" updated={COMPANY.lastUpdated}>
      <P>
        I presenti Termini e Condizioni regolano l&apos;uso della piattaforma <strong>{COMPANY.brand}</strong> ({COMPANY.site})
        e l&apos;acquisto dei corsi di formazione ivi offerti. Il fornitore del servizio è <strong>{COMPANY.legalName}</strong>,
        sede legale {COMPANY.address}, P.IVA/C.F. {COMPANY.vat}, REA {COMPANY.rea} (di seguito &quot;Evalis&quot;).
      </P>

      <H2>1. Oggetto</H2>
      <P>
        Evalis mette a disposizione corsi di formazione professionale online, fruibili in modalità e-learning, con eventuali
        quiz di verifica e rilascio di attestato al superamento dei requisiti previsti. I corsi possono essere acquistati da
        utenti privati (B2C) o da aziende per i propri dipendenti (B2B).
      </P>

      <H2>2. Registrazione e account</H2>
      <UL>
        <li>Per accedere ai corsi è necessario creare un account fornendo dati veritieri e aggiornati.</li>
        <li>L&apos;account è personale e non cedibile; è consentita una sola sessione attiva per utente. È vietata la condivisione delle credenziali.</li>
        <li>L&apos;utente è responsabile della custodia delle proprie credenziali e delle attività svolte tramite il proprio account.</li>
      </UL>

      <H2>3. Prezzi e pagamenti</H2>
      <P>
        I prezzi dei corsi e dei pacchetti sono indicati sulla piattaforma in <strong>Euro (€)</strong> e si intendono{" "}
        <strong>IVA esclusa</strong>: l&apos;IVA di legge è calcolata ed evidenziata in modo trasparente al momento del pagamento,
        prima della conferma dell&apos;ordine. I pagamenti sono elaborati tramite il fornitore <strong>Stripe</strong> (carte
        accettate: Visa, Mastercard, American Express); Evalis non tratta direttamente i dati completi delle carte di pagamento.
        L&apos;accesso al corso è attivato a seguito della conferma del pagamento.
      </P>
      <P>
        Eventuali <strong>prezzi promozionali o &quot;di lancio&quot;</strong> sono offerte a tempo limitato: il prezzo applicato è
        sempre quello indicato al momento dell&apos;acquisto. Gli sconti riservati alle aziende (per iscrizioni multiple allo stesso
        corso) sono applicati automaticamente al pagamento e non sono cumulabili con altre promozioni.
      </P>

      <H2>4. Erogazione e requisiti tecnici</H2>
      <P>
        Il corso è fruibile online tramite browser aggiornato e connessione a Internet. La fruizione è tracciata dal sistema
        (tempi di visione, avanzamento, esiti dei quiz) ai fini del rilascio dell&apos;attestato e degli obblighi di conformità.
        L&apos;attestato è rilasciato solo al soddisfacimento di tutti i requisiti ed è soggetto a verifica.
      </P>

      <H2>5. Diritto di recesso (consumatori)</H2>
      <P>
        Ai sensi degli artt. 52 ss. del Codice del Consumo (D.Lgs. 206/2005), il consumatore ha diritto di recedere entro 14
        giorni dall&apos;acquisto. Tuttavia, trattandosi di <strong>contenuto digitale fornito senza supporto materiale</strong>,
        richiedendo l&apos;accesso immediato al corso l&apos;utente <strong>acconsente espressamente all&apos;esecuzione anticipata
        e riconosce di perdere il diritto di recesso</strong> ai sensi dell&apos;art. 59, comma 1, lett. o) del Codice del Consumo,
        una volta iniziata la fruizione. Fino all&apos;inizio della fruizione, il recesso può essere esercitato scrivendo a{" "}
        <a className="text-primary" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. La presente clausola non si applica ai contratti B2B.
      </P>

      <H2>6. Rimborsi</H2>
      <UL>
        <li>
          <strong>Rimborso integrale entro 14 giorni</strong> dall&apos;acquisto se il corso <strong>non è mai stato avviato</strong>{" "}
          (nessuna lezione iniziata), in conformità al diritto di recesso di cui alla sezione 5.
        </li>
        <li>
          Una volta <strong>iniziata la fruizione</strong> del corso, il rimborso non è dovuto (art. 59, comma 1, lett. o) del
          Codice del Consumo, previo consenso espresso all&apos;esecuzione anticipata prestato all&apos;acquisto).
        </li>
        <li>
          <strong>Come richiederlo</strong>: inviare una email a{" "}
          <a className="text-primary" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> dall&apos;indirizzo associato
          all&apos;account, indicando il corso acquistato e la data dell&apos;ordine.
        </li>
        <li>
          Il rimborso è riaccreditato sullo <strong>stesso metodo di pagamento</strong> utilizzato per l&apos;acquisto, entro{" "}
          <strong>14 giorni</strong> dall&apos;accettazione della richiesta, tramite il circuito Stripe.
        </li>
        <li>
          In caso di malfunzionamento tecnico imputabile alla piattaforma che impedisca in modo persistente la fruizione, l&apos;utente
          può contattare l&apos;assistenza: se il problema non è risolvibile, Evalis valuta il rimborso anche a fruizione iniziata.
        </li>
      </UL>

      <H2>7. Condizioni per le aziende (B2B)</H2>
      <UL>
        <li>L&apos;azienda acquista un numero di posti (seat) e assegna i corsi ai propri dipendenti tramite l&apos;area dedicata.</li>
        <li>In alternativa l&apos;azienda può acquistare singoli corsi o pacchetti per i propri iscritti; gli sconti per iscrizioni multiple allo stesso corso sono applicati automaticamente al pagamento.</li>
        <li>L&apos;azienda è titolare del trattamento dei dati dei propri dipendenti; Evalis agisce come responsabile (v. Privacy Policy).</li>
        <li>L&apos;azienda garantisce di aver informato i propri dipendenti e di disporre delle basi giuridiche per l&apos;assegnazione dei corsi.</li>
      </UL>

      <H2>8. Proprietà intellettuale</H2>
      <P>
        Tutti i contenuti dei corsi (video, slide, testi, quiz, marchi) sono di proprietà di Evalis o dei rispettivi titolari e
        sono protetti dalla normativa sul diritto d&apos;autore. All&apos;utente è concessa una licenza personale, non esclusiva e
        non trasferibile per la sola fruizione. È vietata la riproduzione, distribuzione o comunicazione a terzi senza autorizzazione.
      </P>

      <H2>9. Limitazione di responsabilità</H2>
      <P>
        Evalis si impegna a garantire la continuità del servizio, senza tuttavia poter escludere interruzioni dovute a manutenzione
        o cause di forza maggiore. Evalis non risponde di danni derivanti da un uso improprio della piattaforma o dal mancato rispetto
        dei presenti Termini da parte dell&apos;utente.
      </P>

      <H2>10. Legge applicabile e foro competente</H2>
      <P>
        I presenti Termini sono regolati dalla legge italiana. Per i contratti con i consumatori è competente in via esclusiva il
        foro del luogo di residenza o domicilio del consumatore, se ubicato in Italia. Per i contratti B2B è competente in via
        esclusiva il foro di Napoli Nord.
      </P>

      <H2>11. Contatti</H2>
      <P>
        Per qualsiasi comunicazione: {COMPANY.email} · PEC {COMPANY.pec} · tel. {COMPANY.phone}.
      </P>
    </LegalShell>
  );
}
