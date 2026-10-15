import Link from "next/link";
import { headers } from "next/headers";
import { Clock, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { getCertificatoPerChiave } from "@/features/certificates/lifecycle";
import { checkLimit, getClientIp } from "@/lib/security/rate-limit";
import { GIORNI_ACCREDITATO } from "@/features/certificates/testi";
import { dataBreve as fmtDate } from "@/lib/formato";

export const metadata = { title: "Verifica certificato — Evalis" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Il parametro è il codice del QR oppure il numero stampato sul certificato (dalla landing).
// Le ricerche per numero hanno un limite per IP, come la rotta /api/verify.
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid: chiave } = await params;
  const limitato =
    !UUID.test(chiave) &&
    !(await checkLimit(`verifica:${getClientIp(new Request("http://verifica", { headers: await headers() }))}`, 30, 60_000));
  const result = limitato ? null : await getCertificatoPerChiave(chiave);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-6">
          <Link href="/" className="font-heading text-lg text-near-black">
            <span className="text-primary">Evalis</span>
          </Link>
          <span className="text-sm text-muted-foreground">Verifica certificato</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[0_12px_32px_rgba(26,18,9,0.06)]">
          {limitato ? (
            <Esito icona={<ShieldX className="h-7 w-7" />} tono="bg-secondary text-muted-foreground" titolo="Troppe verifiche">
              Hai fatto molte verifiche in poco tempo. Riprova tra un minuto.
            </Esito>
          ) : !result ? (
            <Esito icona={<ShieldX className="h-7 w-7" />} tono="bg-secondary text-muted-foreground" titolo="Certificato non trovato">
              Nessun certificato corrisponde a questo codice. Controlla il codice o scansiona di nuovo il QR.
            </Esito>
          ) : result.valid ? (
            <div>
              <Esito icona={<ShieldCheck className="h-7 w-7" />} tono="bg-success/10 text-success" titolo="Certificato valido" />
              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Titolare" value={result.learnerName} />
                <Row label="Certificazione" value={result.courseTitle} />
                <Row label="Numero" value={result.number ?? "—"} mono />
                <Row label="Emesso il" value={fmtDate(result.issuedAt)} />
              </dl>
            </div>
          ) : result.provvisorio ? (
            <div>
              <Esito icona={<Clock className="h-7 w-7" />} tono="bg-primary/10 text-primary" titolo="Completamento verificato">
                Certificato provvisorio: il corso è stato completato e l&apos;esame finale superato. Il documento
                definitivo è in emissione (entro {GIORNI_ACCREDITATO} giorni lavorativi).
              </Esito>
              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Titolare" value={result.learnerName} />
                <Row label="Corso" value={result.courseTitle} />
                <Row label="Numero" value={result.number ?? "—"} mono />
                <Row label="Completato il" value={fmtDate(result.completedAt)} />
              </dl>
            </div>
          ) : (
            <Esito icona={<ShieldAlert className="h-7 w-7" />} tono="bg-warning/10 text-warning" titolo="Certificato non valido">
              {result.status === "revoked" ? "Questo certificato è stato revocato." : "Questo certificato non risulta valido."}
            </Esito>
          )}

          <p className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            Verifica pubblica · non richiede account
          </p>
        </div>
      </main>
    </div>
  );
}

function Esito({ icona, tono, titolo, children }: { icona: React.ReactNode; tono: string; titolo: string; children?: React.ReactNode }) {
  return (
    <div className="text-center">
      <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${tono}`}>{icona}</span>
      <h1 className="mt-4 font-heading text-2xl text-near-black">{titolo}</h1>
      {children ? <p className="mt-2 text-sm text-muted-foreground">{children}</p> : null}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right font-medium text-near-black ${mono ? "font-mono text-primary" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
