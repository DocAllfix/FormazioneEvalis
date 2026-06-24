import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, Clock, FileQuestion, Layers, LogIn, PlayCircle } from "lucide-react";
import { getCurrentSession } from "@/lib/auth/server";
import { getPublicCourse, getMyEnrollmentForCourse } from "@/features/catalog/queries";
import { BuyButton } from "@/components/catalog/buy-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getPublicCourse(id);
  return { title: course ? `${course.title} — Evalis` : "Corso — Evalis" };
}

function durationLabel(c: { durationHours: number | null; requiredMinutes: number }): string {
  if (c.durationHours && c.durationHours > 0) return `${c.durationHours} ore`;
  const m = c.requiredMinutes;
  return m >= 60 ? `~${Math.round(m / 60)} ore` : `~${m} min`;
}

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getPublicCourse(id);
  if (!course) notFound();

  const ctx = await getCurrentSession();
  const enrollment = ctx ? await getMyEnrollmentForCourse(ctx.user.id, course.id) : null;

  const included = [
    { icon: PlayCircle, label: "Lezioni video con relatore avatar" },
    { icon: Clock, label: "Tempo minimo di fruizione tracciato a norma" },
    { icon: FileQuestion, label: "Esami con domande a estrazione casuale" },
    { icon: BadgeCheck, label: "Certificato verificabile con QR e codice univoco" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:py-16">
      <Link href="/catalogo" className="text-sm text-muted-foreground transition hover:text-near-black">
        ← Torna al catalogo
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Contenuto */}
        <div>
          <h1 className="font-heading text-3xl text-near-black md:text-4xl">{course.title}</h1>
          {course.description ? (
            <p className="mt-4 text-lg leading-relaxed text-foreground/80">{course.description}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" /> {durationLabel(course)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-primary" /> {course.modules}{" "}
              {course.modules === 1 ? "modulo" : "moduli"} · {course.lessons}{" "}
              {course.lessons === 1 ? "lezione" : "lezioni"}
            </span>
          </div>

          <h2 className="mt-10 font-heading text-xl text-near-black">Cosa include</h2>
          <ul className="mt-4 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
            {included.map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm text-foreground/80">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Certificazione professionale</p>
            <p className="mt-1 font-heading text-2xl text-near-black">{course.title}</p>

            <div className="mt-5">
              {enrollment ? (
                <Link
                  href={`/corso/${enrollment.id}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:brightness-110"
                >
                  Vai al corso <ArrowRight className="h-4 w-4" />
                </Link>
              ) : !ctx ? (
                <Link
                  href={`/login?next=${encodeURIComponent(`/catalogo/${course.id}`)}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:brightness-110"
                >
                  <LogIn className="h-4 w-4" /> Accedi per acquistare
                </Link>
              ) : course.purchasable ? (
                <BuyButton courseId={course.id} />
              ) : (
                <p className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                  Questo corso è disponibile tramite la tua azienda o su richiesta. Contattaci per
                  l'attivazione.
                </p>
              )}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Pagamento sicuro. Accesso immediato dopo l'acquisto; il certificato viene emesso dopo
              il superamento dell'esame e la revisione dello staff.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
