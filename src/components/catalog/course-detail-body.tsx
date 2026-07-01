// Corpo condiviso della scheda corso (hero + sezioni): riusato dalla scheda post-login
// (/corsi/[id], aside = prezzo+Acquista) e dalla pagina pubblica teaser (/corso/[slug],
// aside = "Accedi per iscriverti", niente prezzo). L'`aside` è iniettato dalla pagina.

import {
  BadgeCheck,
  Check,
  Clock,
  FileQuestion,
  Globe,
  Layers,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  Signal,
} from "lucide-react";
import type { PublicCourse } from "@/features/catalog/queries";
import { categoryVisual } from "./category-visual";

export function hoursLabel(c: { durationHours: number | null; requiredMinutes: number }): string {
  if (c.durationHours && c.durationHours > 0) return `${c.durationHours} ore`;
  return c.requiredMinutes >= 60 ? `~${Math.round(c.requiredMinutes / 60)} ore` : `~${c.requiredMinutes} min`;
}

const included = [
  { icon: PlayCircle, label: "Lezioni video con relatore avatar" },
  { icon: Clock, label: "Tempo minimo di fruizione tracciato a norma" },
  { icon: FileQuestion, label: "Esame con domande a estrazione casuale" },
  { icon: BadgeCheck, label: "Certificato verificabile con QR e codice univoco" },
];

export function CourseDetailBody({ c, aside }: { c: PublicCourse; aside: React.ReactNode }) {
  const v = categoryVisual(c.category);
  const d = c.details ?? {};

  return (
    <>
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
        <div className="flex flex-col gap-10">
          {c.prerequisiteCourseId ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">
                    Richiede la {c.prerequisiteTitle ?? "ISO 19011"} per l&apos;applicabilità professionale
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Puoi seguire e completare questo corso liberamente. Senza la certificazione{" "}
                    {c.prerequisiteTitle ?? "ISO 19011"}, però, questa certificazione non è spendibile in
                    ambito lavorativo.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

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

        <aside className="lg:sticky lg:top-24 lg:self-start">{aside}</aside>
      </div>
    </>
  );
}
