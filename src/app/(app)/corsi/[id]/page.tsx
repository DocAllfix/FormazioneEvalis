import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  FileQuestion,
  Globe,
  Layers,
  PlayCircle,
  ShieldCheck,
  Signal,
} from "lucide-react";
import { getCurrentSession } from "@/lib/auth/server";
import { getPublicCourse, getMyEnrollmentForCourse } from "@/features/catalog/queries";
import { categoryVisual } from "@/components/catalog/category-visual";
import { BuyButton } from "@/components/catalog/buy-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getPublicCourse(id);
  return { title: c ? `${c.title} — Evalis` : "Corso — Evalis" };
}

function hoursLabel(c: { durationHours: number | null; requiredMinutes: number }): string {
  if (c.durationHours && c.durationHours > 0) return `${c.durationHours} ore`;
  return c.requiredMinutes >= 60 ? `~${Math.round(c.requiredMinutes / 60)} ore` : `~${c.requiredMinutes} min`;
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
  const v = categoryVisual(c.category);
  const d = c.details ?? {};

  const included = [
    { icon: PlayCircle, label: "Lezioni video con relatore avatar" },
    { icon: Clock, label: "Tempo minimo di fruizione tracciato a norma" },
    { icon: FileQuestion, label: "Esame con domande a estrazione casuale" },
    { icon: BadgeCheck, label: "Certificato verificabile con QR e codice univoco" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/corsi" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-near-black">
        <ArrowLeft className="h-4 w-4" /> Catalogo
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="relative aspect-[2/1] w-full sm:aspect-[21/8]">
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-linear-to-br ${v.gradient}`}>
              <v.Icon className="h-24 w-24 text-white/20" strokeWidth={1.5} />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-near-black/85 via-near-black/30 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium backdrop-blur">{v.label}</span>
          <h1 className="mt-3 max-w-3xl font-heading text-2xl leading-tight md:text-4xl">{c.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {hoursLabel(c)}</span>
            <span className="inline-flex items-center gap-1.5"><Layers className="h-4 w-4" /> {c.modules} moduli · {c.lessons} lezioni</span>
            {d.level ? <span className="inline-flex items-center gap-1.5"><Signal className="h-4 w-4" /> {d.level}</span> : null}
            {d.language ? <span className="inline-flex items-center gap-1.5"><Globe className="h-4 w-4" /> {d.language}</span> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Contenuto */}
        <div className="flex flex-col gap-10">
          {c.description ? <p className="text-lg leading-relaxed text-foreground/80">{c.description}</p> : null}

          {d.objectives && d.objectives.length > 0 ? (
            <section>
              <h2 className="font-heading text-xl text-near-black">Cosa imparerai</h2>
              <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {d.objectives.map((o) => (
                  <li key={o} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span className="text-sm text-foreground/80">{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {d.audience ? (
            <section>
              <h2 className="font-heading text-xl text-near-black">A chi è rivolto</h2>
              <p className="mt-3 leading-relaxed text-foreground/80">{d.audience}</p>
            </section>
          ) : null}

          {c.program.length > 0 ? (
            <section>
              <h2 className="font-heading text-xl text-near-black">Programma del corso</h2>
              <div className="mt-4 flex flex-col gap-3">
                {c.program.map((m, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5">
                    <p className="font-medium text-near-black">{m.title}</p>
                    {m.lessons.length > 0 ? (
                      <ul className="mt-2.5 flex flex-col gap-1.5">
                        {m.lessons.map((l, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <PlayCircle className="h-3.5 w-3.5 shrink-0 text-primary" /> {l}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="font-heading text-xl text-near-black">Cosa include</h2>
            <ul className="mt-4 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {included.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm text-foreground/80">{f.label}</span>
                </li>
              ))}
            </ul>
          </section>

          {c.exam ? (
            <section>
              <h2 className="font-heading text-xl text-near-black">Esame finale</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Soglia", value: `${c.exam.passThreshold}%` },
                  { label: "Domande", value: `${c.exam.questionsToDraw} a estrazione` },
                  { label: "Tentativi", value: c.exam.maxAttempts ? `${c.exam.maxAttempts}` : "illimitati" },
                  { label: "Tempo", value: c.exam.timeLimitSeconds > 0 ? `${Math.round(c.exam.timeLimitSeconds / 60)} min` : "libero" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="mt-1 font-medium text-near-black">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-secondary/30 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
              <div>
                <h2 className="font-heading text-lg text-near-black">Il certificato</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                  {d.certInfo ?? "Certificato verificabile con QR e codice univoco, emesso dopo il superamento dell'esame e la revisione dello staff."}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* CTA sticky */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
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
        </aside>
      </div>
    </div>
  );
}
