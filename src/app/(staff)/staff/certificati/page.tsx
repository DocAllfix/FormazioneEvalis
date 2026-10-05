import { PageHeader } from "@/components/admin/page-header";
import { CertReviewList, type StaffCert } from "@/components/admin/cert-review-list";
import { listCertificatiStaff, type StatoFiltro } from "@/features/certificates/lifecycle";

export const metadata = { title: "Certificati — Evalis Staff" };

const STATI: StatoFiltro[] = ["tutti", "attesa", "accreditati", "revocati"];
const giorno = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Rome" }) : "";

// Tutti i certificati. Chi completa un corso riceve in automatico il PROVVISORIO; il certificato
// ACCREDITATO lo carica qui lo staff, e solo allora sostituisce il provvisorio e parte all'utente.
export default async function StaffCertificatiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stato?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const stato = STATI.includes(sp.stato as StatoFiltro) ? (sp.stato as StatoFiltro) : "tutti";
  const righe = await listCertificatiStaff({ q, stato });
  const items: StaffCert[] = righe.map((c) => ({
    id: c.id,
    status: c.status,
    number: c.number,
    learnerName: c.learnerName,
    learnerEmail: c.learnerEmail,
    courseTitle: c.courseTitle,
    completatoLabel: giorno(c.createdAt),
    accreditatoLabel: giorno(c.issuedAt),
    anagrafica: c.codiceFiscale && c.dataNascita && c.luogoNascita
      ? `CF ${c.codiceFiscale} · nato/a a ${c.luogoNascita} il ${c.dataNascita.split("-").reverse().join("/")}`
      : "Dati per il certificato mancanti",
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Certificati"
        description="Chi completa un corso riceve subito il certificato provvisorio. Carica qui il certificato accreditato: sostituisce il provvisorio nell'area privata e parte via email all'utente."
      />
      <CertReviewList items={items} q={q} stato={stato} />
    </div>
  );
}
