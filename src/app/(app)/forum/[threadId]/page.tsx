import { notFound } from "next/navigation";
import { requireSession, isPlatformAdmin } from "@/features/auth/guards";
import { getThread } from "@/features/community/lifecycle";
import { ThreadView } from "@/components/community/thread-view";

export const metadata = { title: "Discussione — Forum Evalis" };

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const { user } = await requireSession();
  const staff = isPlatformAdmin(user as { email: string; platformRole?: string | null });
  const thread = await getThread(threadId, staff);
  if (!thread) notFound();

  return <ThreadView thread={thread} viewerId={user.id} isStaff={staff} />;
}
