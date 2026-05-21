import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./_components/sidebar";

const AppToaster = dynamic(() => import("@/components/ui/toaster"), {
  ssr: false,
});

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-neutral-950">
      <Sidebar userEmail={user.email ?? "Unknown user"} />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <AppToaster />
    </div>
  );
}
