import Link from "next/link";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { getCertificateByVerifyUuid } from "@/features/certificates/lifecycle";

export const metadata = { title: "Verifica certificato — Evalis" };

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("it-IT") : "—";
}

const statusNote: Record<string, string> = {
  ready_for_review: "Il certificato è in revisione e non è ancora stato emesso.",
  revoked: "Questo certificato è stato revocato.",
};

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const result = await getCertificateByVerifyUuid(uuid);

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
          {!result ? (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <ShieldX className="h-7 w-7" />
              </span>
              <h1 className="mt-4 font-heading text-2xl text-near-black">
                Certificato non trovato
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Nessun certificato corrisponde a questo codice. Controlla il codice o scansiona
                di nuovo il QR.
              </p>
            </div>
          ) : result.valid ? (
            <div>
              <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                  <ShieldCheck className="h-7 w-7" />
                </span>
                <h1 className="mt-4 font-heading text-2xl text-near-black">Certificato valido</h1>
              </div>
              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Titolare" value={result.learnerName} />
                <Row label="Certificazione" value={result.courseTitle} />
                <Row label="Numero" value={result.number ?? "—"} mono />
                <Row label="Emesso il" value={fmtDate(result.issuedAt)} />
              </dl>
            </div>
          ) : (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
                <ShieldAlert className="h-7 w-7" />
              </span>
              <h1 className="mt-4 font-heading text-2xl text-near-black">
                Certificato non valido
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {statusNote[result.status] ?? "Questo certificato non risulta valido."}
              </p>
            </div>
          )}

          <p className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            Verifica pubblica · non richiede account
          </p>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-medium text-near-black ${mono ? "font-mono text-primary" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
