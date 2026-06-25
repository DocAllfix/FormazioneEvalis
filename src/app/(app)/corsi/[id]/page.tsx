import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, Clock, Layers, Signal } from "lucide-react";
import { getCurrentSession } from "@/lib/auth/server";
import { getPublicCourse, getMyEnrollmentForCourse } from "@/features/catalog/queries";
import { CourseDetailBody, hoursLabel } from "@/components/catalog/course-detail-body";
import { BuyButton } from "@/components/catalog/buy-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getPublicCourse(id);
  return { title: c ? `${c.title} — Evalis` : "Corso — Evalis" };
}

function priceLabel(priceCents: number | null, currency: string | null): string {
  if (priceCents == null) return "Su richiesta";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: (currency ?? "eur").toUpperCase() }).format(priceCents / 100);
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getPublicCourse(id);
  if (!c) notFound();

  const ctx = await getCurrentSession();
  const enrollment = ctx ? await getMyEnrollmentForCourse(ctx.user.id, c.id) : null;
  const d = c.details ?? {};

  const aside = (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="font-heading text-3xl text-near-black">{priceLabel(c.priceCents, c.currency)}</p>
      <div className="mt-5">
        {enrollment ? (
          <Link href={`/corso/${enrollment.id}`} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:brightness-110">
            Vai al corso <ArrowRight className="h-4 w-4" />
          </Link>
        ) : c.purchasable ? (
          <BuyButton courseId={c.id} />
        ) : (
          <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            Disponibile tramite la tua azienda o su richiesta.
          </p>
        )}
      </div>
      <ul className="mt-6 flex flex-col gap-3 border-t border-border pt-5 text-sm">
        <li className="flex items-center gap-2.5 text-foreground/80"><Clock className="h-4 w-4 text-primary" /> {hoursLabel(c)} di formazione</li>
        <li className="flex items-center gap-2.5 text-foreground/80"><Layers className="h-4 w-4 text-primary" /> {c.modules} moduli · {c.lessons} lezioni</li>
        {d.level ? <li className="flex items-center gap-2.5 text-foreground/80"><Signal className="h-4 w-4 text-primary" /> Livello {d.level}</li> : null}
        <li className="flex items-center gap-2.5 text-foreground/80"><BadgeCheck className="h-4 w-4 text-primary" /> Certificato incluso</li>
      </ul>
      <p className="mt-5 text-xs text-muted-foreground">Pagamento sicuro. Accesso immediato dopo l&apos;acquisto.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/corsi" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-near-black">
        <ArrowLeft className="h-4 w-4" /> Catalogo
      </Link>
      <CourseDetailBody c={c} aside={aside} />
    </div>
  );
}
