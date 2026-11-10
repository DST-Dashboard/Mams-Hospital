import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "@/features/shell/Shell";
import { currentSession } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session) {
    redirect("/login");
  }

  return <Shell>{children}</Shell>;
}
