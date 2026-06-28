import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { getCourseTreeForEdit } from "@/features/courses/admin-catalog";
import { ContentEditor } from "@/components/admin/content-editor/content-editor";

export const metadata = { title: "Contenuti corso — Evalis Admin" };

export default async function CourseContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tree = await getCourseTreeForEdit(id);
  if (!tree) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link href={`/staff/corsi/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-near-black">
        <ArrowLeft className="h-4 w-4" /> Scheda corso
      </Link>
      <PageHeader title={tree.title} description="Modifica titoli, configurazione esami e banca domande. Il contenuto on-screen delle slide è generato dalla pipeline avatar e non si modifica qui." />
      <ContentEditor tree={tree} />
    </div>
  );
}
