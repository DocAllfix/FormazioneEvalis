import Link from "next/link";
import { Receipt, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/auth/server";
import { listMyPurchases } from "@/features/billing/acquisti";
import { dataBreve, euro } from "@/lib/formato";

export const metadata = { title: "Profilo — Evalis" };

export default async function ProfiloPage({ searchParams }: { searchParams: Promise<{ ricevuta?: string }> }) {
  const ctx = await getCurrentSession();
  if (!ctx) return null; // il layout (app) ha già gate-ato la sessione
  const { user } = ctx;
  const [acquisti, { ricevuta }] = await Promise.all([listMyPurchases(user.id), searchParams]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-3xl text-near-black">Profilo</h1>

      <Card className="mt-8 divide-y divide-border p-0">
        <Field label="Nome" value={user.name || "—"} />
        <Field label="Email" value={user.email} />
      </Card>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <p className="text-sm font-medium text-near-black">Sessione singola attiva</p>
          <p className="text-sm text-muted-foreground">
            Per sicurezza, l&apos;accesso è consentito da un solo dispositivo alla volta: un nuovo
            accesso disconnette gli altri.
          </p>
        </div>
      </div>

      <section id="acquisti" aria-labelledby="acquisti-titolo" className="mt-10 scroll-mt-24">
        <h2 id="acquisti-titolo" className="font-heading text-xl text-near-black">I miei acquisti</h2>
        {ricevuta === "non-disponibile" ? (
          <p className="mt-3 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            La ricevuta non è disponibile in questo momento. Riprova tra qualche minuto; se il problema
            resta, scrivici dall&apos;<Link href="/assistenza" className="text-primary hover:underline">assistenza</Link>.
          </p>
        ) : null}
        {acquisti.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Non hai ancora fatto acquisti.</p>
        ) : (
          <Card className="mt-4 divide-y divide-border p-0">
            {acquisti.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-near-black">{a.cosa}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dataBreve(a.quando)} · {a.tipo === "pacchetto" ? "Pacchetto" : "Corso"}
                    {a.rimborsato ? " · Rimborso registrato" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {a.importoCents != null ? (
                    <span className="text-sm font-medium tabular-nums text-near-black">{euro(a.importoCents, a.valuta)}</span>
                  ) : null}
                  {/* <a> e non <Link>: è una rotta che rimanda a Stripe, niente navigazione client né prefetch */}
                  <a
                    href={`/api/ricevuta/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-primary transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Receipt className="h-4 w-4" /> Scarica ricevuta
                  </a>
                </div>
              </div>
            ))}
          </Card>
        )}
        {acquisti.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Gli importi sono comprensivi di IVA. La ricevuta è emessa da Stripe, il nostro sistema di pagamento.
            Ti serve la fattura? Richiedila dall&apos;<Link href="/assistenza" className="text-primary hover:underline">assistenza</Link>.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-near-black">{value}</span>
    </div>
  );
}
