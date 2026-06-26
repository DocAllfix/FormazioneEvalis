import { HeaderSkeleton, StatCardsSkeleton, CardGridSkeleton } from "@/components/app/page-skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <StatCardsSkeleton />
      <CardGridSkeleton count={3} />
    </div>
  );
}
