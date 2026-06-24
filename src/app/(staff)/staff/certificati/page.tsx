import { PageHeader } from "@/components/admin/page-header";
import { CertReviewList, type PendingCert } from "@/components/admin/cert-review-list";
import { listPendingCertificates } from "@/features/certificates/lifecycle";

export const metadata = { title: "Revisione certificati — Evalis Staff" };

// Coda di revisione: i certificati che hanno soddisfatto i requisiti aspettano
// l'approvazione umana dello staff prima dell'emissione (mai automatica).
export default async function StaffCertificatiPage() {
  const pending = await listPendingCertificates();
  const items: PendingCert[] = pending.map((c) => ({
    id: c.id,
    learnerName: c.learnerName,
    learnerEmail: c.learnerEmail,
    courseTitle: c.courseTitle,
    createdLabel: new Date(c.createdAt).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revisione certificati"
        description="Approva l'emissione (PDF + QR + invio) solo dopo la verifica. L'emissione non è mai automatica."
      />
      <CertReviewList items={items} />
    </div>
  );
}
