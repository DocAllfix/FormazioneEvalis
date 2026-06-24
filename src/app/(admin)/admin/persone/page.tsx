import { PageHeader } from "@/components/admin/page-header";
import { PeopleManager } from "@/components/admin/people-manager";
import { getOrgMembersWithDetails, listOrgInvitations } from "@/features/admin/queries";
import { listPublishedCourses } from "@/features/catalog/queries";

export const metadata = { title: "Persone — Evalis" };

export default async function PersonePage() {
  const [members, invitations, courses] = await Promise.all([
    getOrgMembersWithDetails(),
    listOrgInvitations(),
    listPublishedCourses(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Persone"
        description="Invita i dipendenti, assegna i corsi e monitora i certificati."
      />
      <PeopleManager
        members={members}
        invitations={invitations}
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
      />
    </div>
  );
}
