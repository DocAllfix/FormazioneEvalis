import { notFound } from "next/navigation";
import { getMyCourse } from "@/features/learner/actions";
import { CoursePlayer } from "@/components/player/course-player";

export const metadata = { title: "Corso — Evalis" };

export default async function CorsoPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  // getMyCourse applica sessione + ownership: se non è il mio corso → 404.
  const data = await getMyCourse(enrollmentId).catch(() => null);
  if (!data) notFound();

  return <CoursePlayer enrollmentId={enrollmentId} data={data} />;
}
