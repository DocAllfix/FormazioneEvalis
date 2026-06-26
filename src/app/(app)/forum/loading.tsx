import { HeaderSkeleton, ListSkeleton } from "@/components/app/page-skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <ListSkeleton rows={5} />
    </div>
  );
}
