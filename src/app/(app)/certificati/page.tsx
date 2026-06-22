import Link from "next/link";
import { Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getMyCertificates } from "@/features/learner/queries";
import { CertificateDownloadButton } from "@/components/app/certificate-download-button";

export const metadata = { title: "Certificati — Evalis" };

const statusInfo: Record<string, { text: string; cls: string }> = {
  ready_for_review: { text: "In revisione", cls: "bg-warning/10 text-warning" },
  issued: { text: "Emesso", cls: "bg-success/10 text-success" },
  revoked: { text: "Revocato", cls: "bg-danger/10 text-danger" },
};

function formatDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("it-IT") : "—";
}

export default async function CertificatiPage() {
  const certs = await getMyCertificates();

  return (
    <div>
      <h1 className="font-heading text-3xl text-near-black">Certificati</h1>
      <p className="mt-2 text-muted-foreground">
        I certificati vengono emessi dopo la revisione dello staff. Solo quelli emessi sono scaricabili.
      </p>

      {certs.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Award className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-heading text-xl text-near-black">
            Nessun certificato ancora
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Completa un percorso e supera l&apos;esame finale per richiedere il tuo certificato.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-near-black transition hover:bg-secondary"
          >
            Vai ai miei percorsi
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {certs.map((c) => {
            const info = statusInfo[c.status] ?? {
              text: c.status,
              cls: "bg-secondary text-muted-foreground",
            };
            return (
              <Card
                key={c.id}
                className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading text-lg text-near-black">{c.courseTitle}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${info.cls}`}>
                      {info.text}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.number ? `N. ${c.number}` : "Numero non ancora assegnato"}
                    {c.issuedAt ? ` · Emesso il ${formatDate(c.issuedAt)}` : ""}
                  </p>
                </div>
                {c.status === "issued" && <CertificateDownloadButton id={c.id} />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
