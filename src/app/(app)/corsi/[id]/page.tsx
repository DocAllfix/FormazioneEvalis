import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, BadgePercent, Clock, Layers, Signal } from "lucide-react";
import { getCurrentSession } from "@/lib/auth/server";
import { getPublicCourse, getMyEnrollmentForCourse, listActiveBundles } from "@/features/catalog/queries";
import { courseCompanyDiscountPercent } from "@/features/billing/checkout";
import { getCompanyAdminOrg } from "@/features/admin/context";
import { iso19011Advisory } from "@/features/prerequisites/advisory";
import { CourseDetailBody, hoursLabel } from "@/components/catalog/course-detail-body";
import { euro } from "@/lib/formato";
import { BuyButton } from "@/components/catalog/buy-button";
import { PrezzoCorso } from "@/components/catalog/prezzo-corso";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getPublicCourse(id);
  return { title: c ? `${c.title} — Evalis` : "Corso — Evalis" };
}


export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getPublicCourse(id);
  if (!c) notFound();

  const ctx = await getCurrentSession();
  const [enrollment, advisory, bundles, discountPct] = await Promise.all([
    ctx ? getMyEnrollmentForCourse(ctx.user.id, c.id) : Promise.resolve(null),
    ctx ? iso19011Advisory(ctx.user.id, c.id) : Promise.resolve(null),
    listActiveBundles(),
    (async (): Promise<0 | 20 | 30 | 40> => {
      if (!ctx) return 0;
      // stessa regola del checkout (spazioAcquisti): lo sconto aziendale vale solo per chi
      // compra per l'azienda, cioè titolare e amministratori
      const azienda = await getCompanyAdminOrg(ctx.user.id);
      return azienda ? courseCompanyDiscountPercent(azienda.id, c.id) : 0;
    })(),
  ]);
  const d = c.details ?? {};
  // pacchetti che includono questo corso (per i pick_one: anche come corso a scelta)
  const inBundles = bundles.filter((b) => b.courses.some((bc) => bc.id === c.id));

  const aside = (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <PrezzoCorso c={c} size="lg" />
      {discountPct !== 0 && !enrollment ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
          <BadgePercent className="h-4 w-4" /> Sconto azienda −{discountPct}% applicato al pagamento
        </p>
      ) : null}
      <div className="mt-5">
        {enrollment ? (
          <Link href={`/corso/${enrollment.id}`} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:brightness-110">
            Vai al corso <ArrowRight className="h-4 w-4" />
          </Link>
        ) : c.purchasable ? (
          <BuyButton courseId={c.id} advisory={advisory} />
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
      {!enrollment && inBundles.length > 0 ? (
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-sm font-medium text-near-black">Questo corso è incluso in:</p>
          <ul className="mt-2 space-y-1.5">
            {inBundles.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href="/corsi" className="text-primary hover:underline">{b.title}</Link>
                {b.priceCents != null ? (
                  <span className="shrink-0 font-medium text-near-black">{euro(b.priceCents, b.currency)} <span className="text-[11px] font-normal text-muted-foreground">+ IVA</span></span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
