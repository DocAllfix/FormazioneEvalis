import Link from "next/link";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { listStaffQueue, type TicketStatus } from "@/features/support/lifecycle";

export const metadata = { title: "Ticket — Evalis Staff" };

const statusInfo: Record<TicketStatus, { text: string; cls: string }> = {
  open: { text: "Aperto", cls: "bg-warning/10 text-warning" },
  pending: { text: "In lavorazione", cls: "bg-primary/10 text-primary" },
  closed: { text: "Chiuso", cls: "bg-secondary text-muted-foreground" },
};

export default async function StaffTicketPage() {
  const queue = await listStaffQueue();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ticket di assistenza"
        description="Le richieste aperte dai discenti. Rispondi e chiudi quando risolte."
      />

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <Inbox className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-heading text-xl text-near-black">Nessun ticket aperto</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">La coda è vuota: tutte le richieste sono state gestite.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Discente</th>
                <th className="px-4 py-3 font-medium">Oggetto</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Aggiornato</th>
                <th className="px-4 py-3 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((t) => {
                const info = statusInfo[t.status] ?? { text: t.status, cls: "bg-secondary text-muted-foreground" };
                return (
                  <tr key={t.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <Link href={`/staff/ticket/${t.id}`} className="block">
                        <div className="font-medium text-near-black">{t.learnerName}</div>
                        <div className="text-xs text-muted-foreground">{t.learnerEmail}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      <Link href={`/staff/ticket/${t.id}`} className="block hover:text-primary">
                        {t.subject}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums text-muted-foreground md:table-cell">
                      {new Date(t.updatedAt).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${info.cls}`}>{info.text}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
