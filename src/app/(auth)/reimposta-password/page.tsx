import { Suspense } from "react";
import ResetPassword from "@/components/pages/ResetPassword";

export const metadata = { title: "Reimposta password — Evalis" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}
