import Link from "next/link";
import { Award, BookOpen, CheckCircle2, GraduationCap } from "lucide-react";
import { getMyCertificates, getMyEnrollments } from "@/features/learner/queries";
import { CourseCard } from "@/components/app/course-card";
import { StatCard } from "@/components/app/stat-card";
import { BlurFade } from "@/components/ui/blur-fade";

export const metadata = { title: "I miei percorsi — Evalis" };

export default async function DashboardPage() {
  const [enrollments, certs] = await Promise.all([
    getMyEnrollments(),
    getMyCertificates(),
  ]);

  const inCorso = enrollments.filter((e) => e.status === "in_progress").length;
  const completati = enrollments.filter((e) => e.status === "completed").length;
  const certificati = certs.filter((c) => c.status === "issued").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl text-near-black md:text-3xl">
          I miei percorsi
        </h1>
        <p className="mt-1 text-muted-foreground">Riprendi da dove avevi lasciato.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Percorsi attivi", value: enrollments.length, icon: BookOpen },
          { label: "In corso", value: inCorso, icon: GraduationCap },
          { label: "Completati", value: completati, icon: CheckCircle2 },
          { label: "Certificati", value: certificati, icon: Award },
        ].map((s, i) => (
          <BlurFade key={s.label} delay={0.05 * i}>
            <StatCard label={s.label} value={s.value} icon={s.icon} />
          </BlurFade>
        ))}
      </div>

      {enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-heading text-xl text-near-black">
            Non hai ancora percorsi attivi
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Scegli una certificazione dal catalogo per iniziare la tua preparazione.
          </p>
          <Link
            href="/catalogo"
            className="mt-5 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
          >
            Esplora le certificazioni
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="mb-3 font-heading text-lg text-near-black">
            Continua a imparare
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e, i) => (
              <BlurFade key={e.enrollmentId} delay={0.05 * i}>
                <CourseCard e={e} />
              </BlurFade>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
