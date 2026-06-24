import { getCurrentSession } from "@/lib/auth/server";
import { PageHeader } from "@/components/admin/page-header";
import { listPlatformAdmins } from "@/features/platform/admins";
import { PlatformAdminsManager } from "@/components/admin/platform-admins-manager";

export const metadata = { title: "Team piattaforma — Evalis Admin" };

// Gestione degli admin di piattaforma (Evalis). Il layout (staff) gate già l'accesso.
export default async function StaffTeamPage() {
  const ctx = await getCurrentSession();
  const admins = await listPlatformAdmins();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team piattaforma"
        description="Gli admin Evalis che gestiscono catalogo e certificati. Distinti da discenti e aziende."
      />
      <PlatformAdminsManager admins={admins} currentUserId={ctx!.user.id} />
    </div>
  );
}
