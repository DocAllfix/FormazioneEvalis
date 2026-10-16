import Link from "next/link";
import { Award, FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getMyCertificates } from "@/features/learner/queries";
import { assicuraCertificatiDi } from "@/features/certificates/lifecycle";
import { notaProvvisorio } from "@/features/certificates/testi";
import { CertificateDownloadButton } from "@/components/app/certificate-download-button";
import { dataBreve as formatDate } from "@/lib/formato";
import { sessionePagina } from "@/features/auth/pagina";

export const metadata = { title: "Certificati — Evalis" };

const statusInfo: Record<string, { text: string; cls: string }> = {
  ready_for_review: { text: "Provvisorio", cls: "bg-warning/10 text-warning" },
  issued: { text: "Accreditato", cls: "bg-success/10 text-success" },
  revoked: { text: "Revocato", cls: "bg-danger/10 text-danger" },
};

export default async function CertificatiPage() {
  // rete di sicurezza: chi ha superato l'esame finale e non ha ancora il certificato lo riceve
  // qui, se i requisiti sono tutti soddisfatti (un errore non deve impedire di vedere la pagina)
  const { user } = await sessionePagina();
  await assicuraCertificatiDi(user.id).catch((e) => console.error("[certificati] recupero non riuscito", e));
  const certs = await getMyCertificates();

  return (
    <div>
      <h1 className="font-heading text-3xl text-near-black">Certificati</h1>
      <p className="mt-2 text-muted-foreground">
        Quando completi un corso ricevi subito il certificato provvisorio. Il certificato accreditato arriva via
        email e lo trovi qui, al posto del provvisorio.
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
            Completa un percorso e supera l&apos;esame finale per ricevere il tuo certificato.
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
            const info = (c.soloEvalis && c.status === "issued" ? { text: "Attestato EVALIS", cls: statusInfo.issued.cls } : statusInfo[c.status]) ?? {
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
                    {c.issuedAt ? ` · ${c.soloEvalis ? "Emesso" : "Accreditato"} il ${formatDate(c.issuedAt)}` : ""}
                  </p>
                  {c.status === "ready_for_review" && (
                    <p className="mt-2 max-w-xl text-sm text-foreground/80">{notaProvvisorio(c.soloEvalis)}</p>
                  )}
                </div>
                {c.status === "issued" && <CertificateDownloadButton id={c.id} />}
                {c.status === "ready_for_review" && (
                  <a
                    href={`/api/certificato/${c.id}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-near-black transition hover:bg-secondary"
                  >
                    <FileDown className="h-4 w-4" />
                    Scarica il provvisorio
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
