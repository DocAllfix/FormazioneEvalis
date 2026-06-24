import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { AdminCourseList } from "@/components/admin/admin-course-list";
import { listGlobalCoursesForAdmin } from "@/features/courses/admin-catalog";

export const metadata = { title: "Corsi — Evalis Admin" };

export default async function StaffCorsiPage() {
  const courses = await listGlobalCoursesForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Corsi" description="Catalogo globale: crea, pubblica e ritira i corsi." />
        <Link
          href="/staff/corsi/nuovo"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Nuovo corso
        </Link>
      </div>
      <AdminCourseList courses={courses} />
    </div>
  );
}
