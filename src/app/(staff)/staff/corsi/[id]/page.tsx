import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
      <PageHeader title={course.title} description="Immagine di copertina e scheda del catalogo (post-login)." />
      <CourseEditForm course={course} />
    </div>
  );
}
