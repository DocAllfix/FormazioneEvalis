import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { CourseImportWizard } from "@/components/admin/course-import-wizard";

export const metadata = { title: "Nuovo corso — Evalis Admin" };

export default function NuovoCorsoPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link href="/staff/corsi" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-near-black">
        <ArrowLeft className="h-4 w-4" /> Corsi
      </Link>
      <PageHeader
        title="Nuovo corso (import in blocco)"
        description="Carica il manifest e le clip avatar: il corso viene creato, validato (monte-ore) e pubblicato nel catalogo."
      />
      <CourseImportWizard />
    </div>
  );
}
