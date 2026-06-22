import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MyEnrollment } from "@/features/learner/queries";

const statusLabel: Record<MyEnrollment["status"], { text: string; cls: string }> = {
  not_started: { text: "Da iniziare", cls: "bg-secondary text-muted-foreground" },
  in_progress: { text: "In corso", cls: "bg-primary/10 text-primary" },
  completed: { text: "Completato", cls: "bg-success/10 text-success" },
};

const certLabel: Record<string, { text: string; cls: string }> = {
  ready_for_review: { text: "Certificato in revisione", cls: "bg-warning/10 text-warning" },
  issued: { text: "Certificato emesso", cls: "bg-success/10 text-success" },
  revoked: { text: "Certificato revocato", cls: "bg-danger/10 text-danger" },
};

export function CourseCard({ e }: { e: MyEnrollment }) {
  const st = statusLabel[e.status];
  const cert = e.certificateStatus ? certLabel[e.certificateStatus] : null;
  const cta =
    e.status === "not_started" ? "Inizia" : e.status === "completed" ? "Rivedi" : "Continua";

  return (
    <Card className="flex flex-col gap-4 p-6 transition-shadow hover:shadow-[0_12px_32px_rgba(26,18,9,0.10)]">
      <div className="flex flex-wrap items-start gap-2">
        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>
          {st.text}
        </span>
        {cert && (
          <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${cert.cls}`}>
            {cert.text}
          </span>
        )}
      </div>

      <h3 className="font-heading text-xl text-near-black">{e.courseTitle}</h3>

      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {e.slidesDone}/{e.slidesTotal} unità
          </span>
          <span className="tabular-nums">{e.progressPercent}%</span>
        </div>
        <Progress value={e.progressPercent} className="h-2" />
      </div>

      <Link
        href={`/corso/${e.enrollmentId}`}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}
