"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { supabase } from "../lib/supabase";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function verificarLogin() {
      if (pathname.startsWith("/login")) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
      }
    }

    verificarLogin();
  }, [pathname, router]);

  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="ml-[280px] w-full p-4 lg:p-6 xl:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}