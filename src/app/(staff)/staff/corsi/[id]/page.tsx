import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListTree } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { getAdminCourse } from "@/features/courses/admin-catalog";
import { CourseEditForm } from "@/components/admin/course-edit-form";

export const metadata = { title: "Scheda corso — Evalis Admin" };

export default async function CourseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getAdminCourse(id);
  if (!course) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/staff/corsi" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-near-black">
        <ArrowLeft className="h-4 w-4" /> Corsi
      </Link>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={course.title} description="Immagine di copertina e scheda del catalogo (post-login)." />
        <Link href={`/staff/corsi/${id}/contenuti`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-near-black transition hover:bg-secondary/40">
          <ListTree className="h-4 w-4" /> Contenuti &amp; esami
        </Link>
      </div>
      <CourseEditForm course={course} />
    </div>
  );
}
