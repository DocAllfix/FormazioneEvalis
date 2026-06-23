import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";

// Layout player: a tutto schermo (niente sidebar), solo gate sessione.
export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getCurrentSession();
  if (!ctx) redirect("/login");
  return <>{children}</>;
}
