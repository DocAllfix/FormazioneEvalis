import { PageHeader } from "@/components/admin/page-header";
import { BillingPanel } from "@/components/admin/billing-panel";
import { getOrgOverview } from "@/features/admin/queries";

export const metadata = { title: "Abbonamento — Evalis" };

export default async function BillingPage() {
  const o = await getOrgOverview();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Abbonamento"
        description="Posti e fatturazione, gestiti in sicurezza con Stripe."
      />
      <BillingPanel
        seatsUsed={o.seatsUsed}
        seatLimit={o.seatLimit}
        subscriptionStatus={o.subscriptionStatus}
      />
    </div>
  );
}
