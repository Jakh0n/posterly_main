import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { getCreditBalance, getCurrentUser } from "@/services";

export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const balance = await getCreditBalance(user.id);

  return (
    <AppShell email={user.email ?? ""} balance={balance}>
      {children}
    </AppShell>
  );
}
