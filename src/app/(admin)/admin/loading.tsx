import { HeaderSkeleton, TableSkeleton } from "@/components/app/page-skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <TableSkeleton rows={6} />
    </div>
  );
}
