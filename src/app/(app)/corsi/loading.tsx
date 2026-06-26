import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton, CardGridSkeleton } from "@/components/app/page-skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <Skeleton className="h-11 w-full max-w-md rounded-lg" />
      <CardGridSkeleton count={6} />
    </div>
  );
}
