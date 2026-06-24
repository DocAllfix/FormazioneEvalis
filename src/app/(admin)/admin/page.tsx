import Link from "next/link";
import { ArrowRight, CreditCard, TicketCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/app/stat-card";
import { getOrgOverview } from "@/features/admin/queries";

export const metadata = { title: "Panoramica azienda — Evalis" };

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "evalisformazione.it").split(":")[0];

export default async function AdminOverviewPage() {
  const o = await getOrgOverview();
  const available = Math.max(0, o.seatLimit - o.seatsUsed);
  const hasSubscription = o.seatLimit > 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={o.name} description={`${o.slug}.${ROOT} · spazio azienda`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Dipendenti" value={o.seatsUsed} icon={Users} />
        <StatCard label="Posti disponibili" value={available} icon={TicketCheck} />
        <StatCard label="Posti totali" value={o.seatLimit} icon={CreditCard} />
      </div>

      {!hasSubscription ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-near-black">Attiva l'abbonamento</p>
            <p className="text-sm text-muted-foreground">
              Acquista i posti per invitare i dipendenti e assegnare i corsi.
            </p>
          </div>
          <Link
            href="/admin/billing"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Vai all'abbonamento <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/persone"
          className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
        >
          <div>
            <p className="font-medium text-near-black">Persone</p>
            <p className="text-sm text-muted-foreground">Invita, assegna corsi, monitora.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
        </Link>
        <Link
          href="/admin/billing"
          className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
        >
          <div>
            <p className="font-medium text-near-black">Abbonamento</p>
            <p className="text-sm text-muted-foreground">Posti e fatturazione.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
        </Link>
      </div>
    </div>
  );
}
