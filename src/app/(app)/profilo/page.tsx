import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/auth/server";

export const metadata = { title: "Profilo — Evalis" };

export default async function ProfiloPage() {
  const ctx = await getCurrentSession();
  if (!ctx) return null; // il layout (app) ha già gate-ato la sessione
  const { user } = ctx;

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
