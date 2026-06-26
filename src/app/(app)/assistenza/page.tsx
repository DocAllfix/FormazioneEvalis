import Link from "next/link";
import { LifeBuoy, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/features/auth/guards";
import { listMyTickets, type TicketStatus } from "@/features/support/lifecycle";
import { NewTicketDialog } from "@/components/support/new-ticket-dialog";

export const metadata = { title: "Assistenza — Evalis" };

const statusInfo: Record<TicketStatus, { text: string; cls: string }> = {
  open: { text: "Aperto", cls: "bg-warning/10 text-warning" },
  pending: { text: "In lavorazione", cls: "bg-primary/10 text-primary" },
  closed: { text: "Chiuso", cls: "bg-secondary text-muted-foreground" },
};

export default async function AssistenzaPage() {
  const { user } = await requireSession();
  const tickets = await listMyTickets(user.id);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-near-black">Assistenza</h1>
          <p className="mt-2 text-muted-foreground">
            Apri una richiesta: il nostro staff ti risponde direttamente qui.
          </p>
        </div>
        <NewTicketDialog />
      </div>

      {tickets.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LifeBuoy className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-heading text-xl text-near-black">Nessuna richiesta</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Hai bisogno di aiuto? Apri il tuo primo ticket e ti risponderemo al più presto.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {tickets.map((t) => {
            const info = statusInfo[t.status] ?? { text: t.status, cls: "bg-secondary text-muted-foreground" };
            return (
              <Link key={t.id} href={`/assistenza/${t.id}`} className="block">
                <Card className="flex items-center justify-between gap-4 p-5 transition hover:border-primary/30">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageCircle className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-near-black">{t.subject}</h3>
                      <p className="text-xs text-muted-foreground">
                        Aggiornato il {new Date(t.updatedAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${info.cls}`}>
                    {info.text}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
